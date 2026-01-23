// ========================================
// Database Schema Initialization Script
// Uses pg client directly for multi-statement SQL
// べき等性を確保
// ========================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('  ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Check if schema is already applied by checking for a known table
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'User'
      ) as exists
    `);

    if (result.rows[0].exists) {
      console.log('  Schema already applied, skipping...');
      return;
    }

    console.log('  Applying schema...');

    // Read schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('  ERROR: schema.sql not found at', schemaPath);
      process.exit(1);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema
    await client.query(schemaSql);

    console.log('  Schema applied successfully');
  } catch (error) {
    console.error('  Error initializing schema:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
