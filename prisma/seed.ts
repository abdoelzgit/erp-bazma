import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Bootstrap admin user only
  const adminEmail = "admin@bazma.sch.id";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const legacyAdmin = await prisma.user.findUnique({ where: { email: "admin@smktibazma.sch.id" } });
    if (legacyAdmin) {
      await prisma.user.update({ where: { id: legacyAdmin.id }, data: { email: adminEmail } });
      console.log("Admin email diperbarui ke admin@bazma.sch.id");
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Administrator Bazma",
          password: await bcrypt.hash("admin123", 10),
          role: "ADMIN",
        },
      });
      console.log("Admin user dibuat: admin@bazma.sch.id / admin123");
    }
  } else {
    console.log("Admin user sudah ada.");
  }

  // ponytail: Data departemen, account, budget sudah ada dari migrasi sebelumnya.
  // Seed demo dihapus sesuai Tahap 5 implementation plan.
}

main()
  .catch((error) => {
    console.error("Gagal menjalankan seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
