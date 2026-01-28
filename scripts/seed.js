// ========================================
// Database Seed Script (JavaScript version)
// べき等性を確保
// ========================================

const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const prisma = new PrismaClient();

function hashApiKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@box2.local' },
    update: {},
    create: {
      email: 'admin@box2.local',
      name: 'System Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  // Create LDAP user mapping for admin
  await prisma.ldapUserMapping.upsert({
    where: { ldapUsername: 'admin' },
    update: {},
    create: {
      ldapUsername: 'admin',
      userId: admin.id,
      ldapDN: 'uid=admin,ou=users,dc=box2,dc=local',
      email: 'admin@box2.local',
      displayName: 'System Administrator',
      mappingType: 'MANUAL',
    },
  });

  // Create Process Categories for evaluation (プロセス評価項目)
  const processCategories = [
    {
      name: 'Aプロセス',
      nameEn: 'Class A Process',
      categoryCode: 'A',
      description: '戦略的な重要プロジェクト',
      minItemCount: 2,
      scores: JSON.stringify({ T4: 110, T3: 100, T2: 80, T1: 60 }),
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Bプロセス',
      nameEn: 'Class B Process',
      categoryCode: 'B',
      description: '中程度の影響力を持つプロジェクト',
      minItemCount: 0,
      scores: JSON.stringify({ T4: 100, T3: 90, T2: 70, T1: 50 }),
      sortOrder: 2,
      isActive: false,
    },
    {
      name: 'Cプロセス',
      nameEn: 'Class C Process',
      categoryCode: 'C',
      description: '標準的なプロジェクト',
      minItemCount: 0,
      scores: JSON.stringify({ T4: 90, T3: 80, T2: 50, T1: 20 }),
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Dプロセス',
      nameEn: 'Class D Process',
      categoryCode: 'D',
      description: '影響力が限定的なプロジェクト',
      minItemCount: 0,
      scores: JSON.stringify({ T4: 80, T3: 70, T2: 40, T1: 10 }),
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
    console.log(`  Process Categories: ${processCategories.length} items created`);
  } else {
    console.log('  Process Categories: already exist, skipping...');
  }

  // Create Growth Categories for evaluation (成長評価カテゴリ)
  // T2=80を標準として設定、係数は計算時に別途適用
  const growthCategories = [
    {
      name: 'スキル向上',
      nameEn: 'Skill Development',
      description: '日常業務を高度化・効率化する技術・手法の取得',
      coefficient: 1.0,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: '資格取得',
      nameEn: 'Certification',
      description: '国家資格・ベンダー資格などの客観的証明の取得',
      coefficient: 1.2,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: '知識深化',
      nameEn: 'Knowledge Deepening',
      description: '業界・学術知識の体系的深化／社内外への発信',
      coefficient: 1.0,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: '部下指導',
      nameEn: 'Mentoring',
      description: '後輩育成・メンター活動・OJT設計',
      coefficient: 1.5,
      scoreT4: 100,
      scoreT3: 90,
      scoreT2: 80,
      scoreT1: 60,
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
    console.log(`  Growth Categories: ${growthCategories.length} items created`);
  } else {
    console.log('  Growth Categories: already exist, skipping...');
  }

  // Create TicketSalesApiKey for F/E app authentication
  const ticketSalesApiKey = 'bee2b026237296f9a097a90c4c960566d3327c860a1dfd62435050df21b5dacb';
  const hashedApiKey = hashApiKey(ticketSalesApiKey);

  await prisma.ticketSalesApiKey.upsert({
    where: { apiKey: hashedApiKey },
    update: {
      adminNfcId: '0116020053187C01',
      adminEmail: 'matsumura@occ.co.jp',
    },
    create: {
      apiKey: hashedApiKey,
      adminNfcId: '0116020053187C01',
      adminEmail: 'matsumura@occ.co.jp',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`  Admin user: ${admin.email} (${admin.role})`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
