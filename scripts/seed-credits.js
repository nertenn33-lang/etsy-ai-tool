require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const uid = process.argv[2] || process.env.UID;
const credits = parseInt(process.argv[3] || "5", 10);
if (!uid) {
  console.error("Usage: node scripts/seed-credits.js <uid> [credits]");
  process.exit(1);
}
const p = new PrismaClient();
p.user
  .upsert({
    where: { id: uid },
    create: { id: uid, credits },
    update: { credits },
  })
  .then(() => {
    console.log("Credits set to", credits, "for", uid);
    p.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
