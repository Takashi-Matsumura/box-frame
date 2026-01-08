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

  // Create OpenLDAP configuration
  const openLdapConfig = await prisma.openLdapConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      isEnabled: true,
      serverUrl: "ldap://localhost:390",
      adminDN: "cn=admin,dc=boxframe,dc=local",
      adminPassword: "admin",
      baseDN: "dc=boxframe,dc=local",
      usersOU: "ou=users,dc=boxframe,dc=local",
      timeout: 10000,
    },
  });

  // Create Growth Categories for evaluation
  const growthCategories = [
    {
      name: "資格取得",
      nameEn: "Certification",
      description: "業務に関連する資格の取得",
      scoreT4: 2.0,
      scoreT3: 1.5,
      scoreT2: 1.0,
      scoreT1: 0.5,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "スキル向上",
      nameEn: "Skill Development",
      description: "専門スキルの習得・向上",
      scoreT4: 2.0,
      scoreT3: 1.5,
      scoreT2: 1.0,
      scoreT1: 0.5,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "リーダーシップ",
      nameEn: "Leadership",
      description: "チームリーダーとしての成長",
      scoreT4: 2.5,
      scoreT3: 2.0,
      scoreT2: 1.5,
      scoreT1: 1.0,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "プロジェクト貢献",
      nameEn: "Project Contribution",
      description: "重要プロジェクトへの貢献度",
      scoreT4: 2.5,
      scoreT3: 2.0,
      scoreT2: 1.5,
      scoreT1: 1.0,
      sortOrder: 4,
      isActive: true,
    },
  ];

  // Check if any growth categories exist
  const existingCategories = await prisma.growthCategory.count();
  if (existingCategories === 0) {
    await prisma.growthCategory.createMany({
      data: growthCategories,
    });
  }

  console.log("✅ Database seeded successfully!");
  console.log("Created admin user:");
  console.log(`  - ${admin.email} (${admin.role})`);
  console.log("\nOpenLDAP credentials:");
  console.log("  - Username: admin");
  console.log("  - Password: admin");
  console.log(`\nGrowth Categories: ${growthCategories.length} items created`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
