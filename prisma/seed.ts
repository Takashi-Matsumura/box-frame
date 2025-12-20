import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@boxframe.local" },
    update: {},
    create: {
      email: "admin@boxframe.local",
      name: "System Administrator",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  // Create LDAP user mapping for admin
  await prisma.ldapUserMapping.upsert({
    where: { ldapUsername: "admin" },
    update: {},
    create: {
      ldapUsername: "admin",
      userId: admin.id,
      ldapDN: "uid=admin,ou=users,dc=boxframe,dc=local",
      email: "admin@boxframe.local",
      displayName: "System Administrator",
      mappingType: "MANUAL",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("Created admin user:");
  console.log(`  - ${admin.email} (${admin.role})`);
  console.log("\nOpenLDAP credentials:");
  console.log("  - Username: admin");
  console.log("  - Password: admin");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
