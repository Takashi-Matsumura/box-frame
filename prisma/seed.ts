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

  // Create Process Categories for evaluation (プロセス評価項目)
  const processCategories = [
    {
      name: "プロセスA",
      nameEn: "Process A",
      categoryCode: "A",
      description: "戦略的な重要プロジェクト",
      minItemCount: 2,
      scores: JSON.stringify({ T4: 130, T3: 110, T2: 80, T1: 60 }),
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "プロセスB",
      nameEn: "Process B",
      categoryCode: "B",
      description: "中程度の影響力を持つプロジェクト",
      minItemCount: 1,
      scores: JSON.stringify({ T4: 100, T3: 90, T2: 70, T1: 50 }),
      sortOrder: 2,
      isActive: false,
    },
    {
      name: "プロセスC",
      nameEn: "Process C",
      categoryCode: "C",
      description: "標準的なプロジェクト",
      minItemCount: 0,
      scores: JSON.stringify({ T4: 90, T3: 80, T2: 50, T1: 30 }),
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "プロセスD",
      nameEn: "Process D",
      categoryCode: "D",
      description: "影響力が限定的なプロジェクト",
      minItemCount: 0,
      scores: JSON.stringify({ T4: 80, T3: 70, T2: 40, T1: 20 }),
      sortOrder: 4,
      isActive: false,
    },
  ];

  // Check if any process categories exist
  const existingProcessCategories = await prisma.processCategory.count();
  if (existingProcessCategories === 0) {
    await prisma.processCategory.createMany({
      data: processCategories,
    });
    console.log(`Process Categories: ${processCategories.length} items created`);
  }

  // Create Growth Categories for evaluation (成長評価カテゴリ)
  // T2=80を標準として設定、係数は計算時に別途適用
  const growthCategories = [
    {
      name: "スキル向上",
      nameEn: "Skill Development",
      description: "日常業務を高度化・効率化する技術・手法の取得",
      coefficient: 1.0,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "資格取得",
      nameEn: "Certification",
      description: "国家資格・ベンダー資格などの客観的証明の取得",
      coefficient: 1.3,
      scoreT4: 120,
      scoreT3: 100,
      scoreT2: 80,
      scoreT1: 70,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "知識深化",
      nameEn: "Knowledge Deepening",
      description: "業界・学術知識の体系的深化／社内外への発信",
      coefficient: 1.0,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "部下育成",
      nameEn: "Mentoring",
      description: "後輩育成・メンター活動・OJT設計",
      coefficient: 1.5,
      scoreT4: 130,
      scoreT3: 110,
      scoreT2: 80,
      scoreT1: 70,
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

  // Create Japanese National Holidays for 2026
  const holidays2026 = [
    { date: "2026-01-01", name: "元日", nameEn: "New Year's Day" },
    { date: "2026-01-12", name: "成人の日", nameEn: "Coming of Age Day" },
    { date: "2026-02-11", name: "建国記念の日", nameEn: "National Foundation Day" },
    { date: "2026-02-23", name: "天皇誕生日", nameEn: "Emperor's Birthday" },
    { date: "2026-03-20", name: "春分の日", nameEn: "Vernal Equinox Day" },
    { date: "2026-04-29", name: "昭和の日", nameEn: "Showa Day" },
    { date: "2026-05-03", name: "憲法記念日", nameEn: "Constitution Memorial Day" },
    { date: "2026-05-04", name: "みどりの日", nameEn: "Greenery Day" },
    { date: "2026-05-05", name: "こどもの日", nameEn: "Children's Day" },
    { date: "2026-05-06", name: "振替休日", nameEn: "Substitute Holiday" },
    { date: "2026-07-20", name: "海の日", nameEn: "Marine Day" },
    { date: "2026-08-11", name: "山の日", nameEn: "Mountain Day" },
    { date: "2026-09-21", name: "敬老の日", nameEn: "Respect for the Aged Day" },
    { date: "2026-09-22", name: "国民の休日", nameEn: "Citizens' Holiday" },
    { date: "2026-09-23", name: "秋分の日", nameEn: "Autumnal Equinox Day" },
    { date: "2026-10-12", name: "スポーツの日", nameEn: "Sports Day" },
    { date: "2026-11-03", name: "文化の日", nameEn: "Culture Day" },
    { date: "2026-11-23", name: "勤労感謝の日", nameEn: "Labor Thanksgiving Day" },
  ];

  // Check if any holidays exist
  const existingHolidayCount = await prisma.holiday.count();
  if (existingHolidayCount === 0) {
    for (const holiday of holidays2026) {
      await prisma.holiday.create({
        data: {
          date: new Date(holiday.date),
          name: holiday.name,
          nameEn: holiday.nameEn,
          type: "national",
        },
      });
    }
    console.log(`\n🎌 Japanese Holidays: ${holidays2026.length} items created for 2026`);
  } else {
    console.log(`\n🎌 Japanese Holidays: Skipped (${existingHolidayCount} items already exist)`);
  }

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
