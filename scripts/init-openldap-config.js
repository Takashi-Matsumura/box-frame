// ========================================
// OpenLdapConfig 初期化スクリプト
// べき等性を確保（既存設定があればスキップ）
// ========================================

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    // 既存の設定を確認
    const existing = await prisma.openLdapConfig.findFirst();

    if (existing) {
      console.log('  OpenLdapConfig already exists, skipping...');
      return;
    }

    // 新規作成
    await prisma.openLdapConfig.create({
      data: {
        id: 'default',
        serverUrl: process.env.OPENLDAP_URL || 'ldap://openldap:389',
        baseDN: process.env.OPENLDAP_BASE_DN || 'dc=box2,dc=local',
        adminDN: process.env.OPENLDAP_ADMIN_DN || 'cn=admin,dc=box2,dc=local',
        adminPassword: process.env.OPENLDAP_ADMIN_PASSWORD || 'admin',
        usersOU: process.env.OPENLDAP_USERS_OU || 'ou=users,dc=box2,dc=local',
        timeout: 10000,
      },
    });

    console.log('  OpenLdapConfig created successfully');
  } catch (error) {
    // 既に存在する場合はエラーを無視
    if (error.code === 'P2002') {
      console.log('  OpenLdapConfig already exists');
    } else {
      console.error('  Error configuring OpenLdapConfig:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
