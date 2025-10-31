#!/usr/bin/env node

/**
 * Robust ETL Script: CSV → Cloudflare D1
 * Handles empty values, missing data, special characters
 * Usage: node etl-robust.cjs
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const CSV_FILE = 'src/dummy_emissions_data_FS.csv';
const DB_NAME = 'emissions-db';

console.log('🌱 Starting ETL Pipeline...\n');

// Helper: Clean and validate value
function cleanValue(value, defaultValue = null) {
  if (!value || value.trim() === '' || value === 'undefined') {
    return defaultValue;
  }
  return value.trim();
}

// Helper: Escape SQL string
function sqlEscape(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Step 1: Read and parse CSV
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));

console.log('Headers found:', headers);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const row = {};
  headers.forEach((header, idx) => {
    row[header] = cleanValue(values[idx]);
  });
  if (row.Company) { // Only include rows with a company name
    rows.push(row);
  }
}

console.log(`✅ Found ${rows.length} valid rows\n`);

// Step 2: Extract unique companies
console.log('🏢 Extracting companies...');
const companies = new Map();

rows.forEach(row => {
  const name = row.Company;
  if (!companies.has(name)) {
    companies.set(name, {
      name: name,
      sector: cleanValue(row.Sector, 'Other'),
      region: cleanValue(row.Region, 'Unknown'),
      ownership: cleanValue(row.Ownership, 'Public'),
      baseline_year: cleanValue(row['Baseline Year'], '2020'),
      net_zero_year: cleanValue(row['Net Zero Year'], '2050'),
      interim_target_year: cleanValue(row['Interim Target Year']),
      interim_reduction_percent: cleanValue(row['Interim Reduction %'])
    });
  }
});

console.log(`✅ Found ${companies.size} unique companies\n`);

// Step 3: Generate SQL
console.log('📝 Generating SQL...');
let sql = '-- Auto-generated ETL script\n';
sql += '-- Date: ' + new Date().toISOString() + '\n\n';

sql += '-- Insert Companies\n';
companies.forEach(company => {
  const interim_year = company.interim_target_year ? company.interim_target_year : 'NULL';
  const interim_pct = company.interim_reduction_percent ? company.interim_reduction_percent : 'NULL';

  sql += `INSERT OR IGNORE INTO companies (name, sector, region, ownership, baseline_year, net_zero_year, interim_target_year, interim_reduction_percent) VALUES `;
  sql += `('${sqlEscape(company.name)}', '${sqlEscape(company.sector)}', '${sqlEscape(company.region)}', '${sqlEscape(company.ownership)}', ${company.baseline_year}, ${company.net_zero_year}, ${interim_year}, ${interim_pct});\n`;
});

sql += '\n-- Insert Emissions\n';
rows.forEach(row => {
  const year = cleanValue(row.Year);
  const scope1 = cleanValue(row['Scope 1'], '0');
  const scope2 = cleanValue(row['Scope 2']) || 'NULL';
  const scope3 = cleanValue(row['Scope 3'], '0');

  if (year) {
    sql += `INSERT INTO emissions (company_id, year, scope_1, scope_2, scope_3) `;
    sql += `SELECT id, ${year}, ${scope1}, ${scope2}, ${scope3} FROM companies WHERE name = '${sqlEscape(row.Company)}';\n`;
  }
});

// Step 4: Write SQL file
const sqlFile = './temp-import.sql';
fs.writeFileSync(sqlFile, sql);
console.log(`✅ Generated SQL file (${sql.split('\n').length} lines)\n`);

// Show first few lines for debugging
console.log('First 10 lines of SQL:');
console.log(sql.split('\n').slice(0, 10).join('\n'));
console.log('...\n');

// Step 5: Load into D1
console.log('🚀 Loading into D1...');
try {
  execSync(`npx wrangler d1 execute ${DB_NAME} --remote --file=${sqlFile}`, {
    stdio: 'inherit'
  });
  console.log('\n✅ ETL Complete!\n');

  // Cleanup
  fs.unlinkSync(sqlFile);
  console.log('🧹 Cleaned up temporary files\n');

  // Verify
  console.log('🔍 Verifying data...\n');
  console.log('Companies:');
  execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT COUNT(*) FROM companies"`, {
    stdio: 'inherit'
  });
  console.log('\nEmissions:');
  execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT COUNT(*) FROM emissions"`, {
    stdio: 'inherit'
  });
  console.log('\nSample data:');
  execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT name, sector, region FROM companies LIMIT 3"`, {
    stdio: 'inherit'
  });

} catch (error) {
  console.error('\n ETL failed:', error.message);
  console.log('\n SQL file saved at:', sqlFile);
  console.log('You can inspect it to see what went wrong.\n');
  process.exit(1);
}

console.log('\n All done! Your data is in D1.');
console.log(`\n Summary:`);
console.log(`   - Companies: ${companies.size}`);
console.log(`   - Emissions records: ${rows.length}`);
console.log(`   - Database: ${DB_NAME}\n`);
