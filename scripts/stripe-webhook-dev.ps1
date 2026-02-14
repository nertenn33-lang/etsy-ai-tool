# Stripe webhook dev: one listener only. Get whsec (--print-secret or from live listen output), write .env.local, then keep that session running.
# Run from repo root: .\scripts\stripe-webhook-dev.ps1
# Optional: .\scripts\stripe-webhook-dev.ps1 -Port 3000
# No temp process kill, no second listener — zero mismatch risk.

param([int]$Port = 3000)

$ForwardUrl = "http://localhost:$Port/api/stripe/webhook"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EnvLocalPath = Join-Path $RepoRoot ".env.local"

$whsec = $null

# --- Path A: Try stripe listen --print-secret ---
Write-Host "[stripe-webhook-dev] Trying stripe listen --print-secret ..." -ForegroundColor Cyan
$out = & stripe listen --print-secret 2>&1
$exitCode = $LASTEXITCODE
$str = ($out | Out-String).Trim()
if ($exitCode -eq 0 -and $str -match "(whsec_[A-Za-z0-9]+)") {
  $whsec = $Matches[1]
}

if ($whsec) {
  # --- Path A: write env, then start ONE foreground listener ---
  $key = "STRIPE_WEBHOOK_SECRET"
  $line = "${key}=${whsec}"
  $content = ""
  if (Test-Path $EnvLocalPath) { $content = Get-Content $EnvLocalPath -Raw }
  if ($content -match "(?m)^${key}=.*") { $content = $content -replace "(?m)^${key}=.*", $line }
  else {
    if ($content -and (-not $content.EndsWith("`n"))) { $content += "`n" }
    $content += "`n$line`n"
  }
  Set-Content -Path $EnvLocalPath -Value $content.TrimEnd() -NoNewline:$false

  $tail = if ($whsec.Length -gt 6) { $whsec.Substring($whsec.Length - 6) } else { "(short)" }
  Write-Host ""
  Write-Host "========== Secret tail = $tail ==========" -ForegroundColor Green
  Write-Host "After restarting Next, run: stripe trigger payment_intent.succeeded" -ForegroundColor Green
  Write-Host "========== Restart Next dev server now (Ctrl+C, npm run dev) ==========" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "[stripe-webhook-dev] Starting listener (one process) ..." -ForegroundColor Cyan
  Write-Host ""

  & stripe listen --forward-to $ForwardUrl
  exit
}

# --- Path B: Start ONE listener, capture whsec from its output, write env, keep it running ---
Write-Host "[stripe-webhook-dev] --print-secret not available. Starting one listener, will capture whsec from output and keep it running ..." -ForegroundColor Cyan
$TempOut = Join-Path $env:TEMP "stripe_listen_out_$PID.txt"
$TempErr = Join-Path $env:TEMP "stripe_listen_err_$PID.txt"
# Ensure files exist for reading
"" | Set-Content $TempOut -ErrorAction SilentlyContinue
"" | Set-Content $TempErr -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath "stripe" -ArgumentList "listen", "--forward-to", $ForwardUrl `
  -NoNewWindow -PassThru -RedirectStandardOutput $TempOut -RedirectStandardError $TempErr

$maxWait = 15
$waited = 0
$lastLenErr = 0
$lastLenOut = 0

while ($waited -lt $maxWait) {
  Start-Sleep -Milliseconds 400
  $waited += 1

  $errContent = ""
  $outContent = ""
  if (Test-Path $TempErr) { $errContent = Get-Content $TempErr -Raw -ErrorAction SilentlyContinue }
  if (Test-Path $TempOut) { $outContent = Get-Content $TempOut -Raw -ErrorAction SilentlyContinue }
  $combined = $errContent + "`n" + $outContent

  # Echo new output to console so user sees listener output
  $errLen = $errContent.Length
  $outLen = $outContent.Length
  if ($errLen -gt $lastLenErr) {
    $newErr = $errContent.Substring($lastLenErr)
    Write-Host $newErr -NoNewline
    $lastLenErr = $errLen
  }
  if ($outLen -gt $lastLenOut) {
    $newOut = $outContent.Substring($lastLenOut)
    Write-Host $newOut -NoNewline
    $lastLenOut = $outLen
  }

  if ($combined -match "(whsec_[A-Za-z0-9]+)") {
    $whsec = $Matches[1]
    break
  }

  if ($proc.HasExited) { break }
}

if (-not $whsec -or $whsec -notlike "whsec_*") {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Write-Host "[stripe-webhook-dev] Could not capture whsec from listener output after ${maxWait}s. Check $TempErr and $TempOut" -ForegroundColor Red
  exit 1
}

# Write .env.local and print instructions (same listener keeps running)
$key = "STRIPE_WEBHOOK_SECRET"
$line = "${key}=${whsec}"
$content = ""
if (Test-Path $EnvLocalPath) { $content = Get-Content $EnvLocalPath -Raw }
if ($content -match "(?m)^${key}=.*") { $content = $content -replace "(?m)^${key}=.*", $line }
else {
  if ($content -and (-not $content.EndsWith("`n"))) { $content += "`n" }
  $content += "`n$line`n"
}
Set-Content -Path $EnvLocalPath -Value $content.TrimEnd() -NoNewline:$false

$tail = if ($whsec.Length -gt 6) { $whsec.Substring($whsec.Length - 6) } else { "(short)" }
Write-Host ""
Write-Host "========== Secret tail = $tail ==========" -ForegroundColor Green
Write-Host "After restarting Next, run: stripe trigger payment_intent.succeeded" -ForegroundColor Green
Write-Host "========== Restart Next dev server now (Ctrl+C, npm run dev) ==========" -ForegroundColor Yellow
Write-Host ""
Write-Host "[stripe-webhook-dev] Same listener still running below. Leave this terminal open." -ForegroundColor Cyan
Write-Host ""

# Keep streaming this same process's output until it exits (no second listener)
while (-not $proc.HasExited) {
  Start-Sleep -Milliseconds 300
  $errContent = ""
  $outContent = ""
  if (Test-Path $TempErr) { $errContent = Get-Content $TempErr -Raw -ErrorAction SilentlyContinue }
  if (Test-Path $TempOut) { $outContent = Get-Content $TempOut -Raw -ErrorAction SilentlyContinue }
  if ($errContent.Length -gt $lastLenErr) {
    Write-Host $errContent.Substring($lastLenErr) -NoNewline
    $lastLenErr = $errContent.Length
  }
  if ($outContent.Length -gt $lastLenOut) {
    Write-Host $outContent.Substring($lastLenOut) -NoNewline
    $lastLenOut = $outContent.Length
  }
}

# Process exited (e.g. user closed Stripe or Ctrl+C on the process)
exit $proc.ExitCode
