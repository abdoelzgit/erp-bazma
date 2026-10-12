import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bazma.sch.id" },
    update: {
      password: hashedPassword,
    },
    create: {
      email: "admin@smktibazma.sch.id",
      name: "Administrator Bazma",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✓ Berhasil seed user admin:", admin.email);
  console.log("  Password default : admin123");
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
