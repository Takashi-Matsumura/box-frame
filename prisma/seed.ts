import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

// APIキーをハッシュ化
function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

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
  const _openLdapConfig = await prisma.openLdapConfig.upsert({
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
  // ProcessCategoryと同じスケール（50-130程度）を使用
  const growthCategories = [
    {
      name: "資格取得",
      nameEn: "Certification",
      description: "業務に関連する資格の取得",
      coefficient: 1.0,
      scoreT4: 115,
      scoreT3: 100,
      scoreT2: 80,
      scoreT1: 50,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "スキル向上",
      nameEn: "Skill Development",
      description: "専門スキルの習得・向上",
      coefficient: 1.0,
      scoreT4: 115,
      scoreT3: 100,
      scoreT2: 80,
      scoreT1: 50,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "リーダーシップ",
      nameEn: "Leadership",
      description: "チームリーダーとしての成長（難易度高）",
      coefficient: 1.3,
      scoreT4: 100, // ×1.3 = 130
      scoreT3: 85, // ×1.3 ≈ 110
      scoreT2: 70, // ×1.3 ≈ 91
      scoreT1: 46, // ×1.3 ≈ 60
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "プロジェクト貢献",
      nameEn: "Project Contribution",
      description: "重要プロジェクトへの貢献度（難易度高）",
      coefficient: 1.3,
      scoreT4: 100, // ×1.3 = 130
      scoreT3: 85, // ×1.3 ≈ 110
      scoreT2: 70, // ×1.3 ≈ 91
      scoreT1: 46, // ×1.3 ≈ 60
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

  // Create TicketSalesApiKey for F/E app authentication
  const ticketSalesApiKey = "bee2b026237296f9a097a90c4c960566d3327c860a1dfd62435050df21b5dacb";
  const hashedApiKey = hashApiKey(ticketSalesApiKey);

  const ticketApiKey = await prisma.ticketSalesApiKey.upsert({
    where: { apiKey: hashedApiKey },
    update: {
      adminNfcId: "0116020053187C01",
      adminEmail: "matsumura@occ.co.jp",
    },
    create: {
      apiKey: hashedApiKey,
      adminNfcId: "0116020053187C01",
      adminEmail: "matsumura@occ.co.jp",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("Created admin user:");
  console.log(`  - ${admin.email} (${admin.role})`);
  console.log("\nOpenLDAP credentials:");
  console.log("  - Username: admin");
  console.log("  - Password: admin");
  console.log(`\nGrowth Categories: ${growthCategories.length} items created`);
  console.log("\nTicketSalesApiKey:");
  console.log(`  - Admin NFC ID: ${ticketApiKey.adminNfcId}`);
  console.log(`  - Admin Email: ${ticketApiKey.adminEmail}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
