import DashboardClient from "@/app/components/DashboardClient";

/**
 * Full app route — always renders generic DashboardClient.
 * Use /app to develop or use the full app when landing is live at /.
 */
export default function AppPage() {
  return <DashboardClient />;
}
