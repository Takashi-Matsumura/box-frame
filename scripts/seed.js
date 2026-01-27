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

  // Create Growth Categories for evaluation
  const growthCategories = [
    {
      name: '資格取得',
      nameEn: 'Certification',
      description: '業務に関連する資格の取得',
      coefficient: 1.0,
      scoreT4: 115,
      scoreT3: 100,
      scoreT2: 80,
      scoreT1: 50,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'スキル向上',
      nameEn: 'Skill Development',
      description: '専門スキルの習得・向上',
      coefficient: 1.0,
      scoreT4: 115,
      scoreT3: 100,
      scoreT2: 80,
      scoreT1: 50,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'リーダーシップ',
      nameEn: 'Leadership',
      description: 'チームリーダーとしての成長（難易度高）',
      coefficient: 1.3,
      scoreT4: 100,
      scoreT3: 85,
      scoreT2: 70,
      scoreT1: 46,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'プロジェクト貢献',
      nameEn: 'Project Contribution',
      description: '重要プロジェクトへの貢献度（難易度高）',
      coefficient: 1.3,
      scoreT4: 100,
      scoreT3: 85,
      scoreT2: 70,
      scoreT1: 46,
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
