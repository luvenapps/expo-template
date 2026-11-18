#!/usr/bin/env node
/**
 * Generate RLS policies from DOMAIN config
 * This makes RLS policies generic and template-ready
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Read DOMAIN config
const domainConfigPath = path.join(rootDir, 'src/config/domain.config.ts');
const domainConfigContent = fs.readFileSync(domainConfigPath, 'utf8');

// Extract table names from DOMAIN config (simple regex approach)
// In a more complex scenario, you might use TypeScript compiler API
const extractTableName = (entityKey) => {
  const regex = new RegExp(`${entityKey}:\\s*{[^}]*remoteTableName:\\s*['"]([^'"]+)['"]`, 's');
  const match = domainConfigContent.match(regex);
  return match ? match[1] : null;
};

const primaryTable = extractTableName('primary');
const entriesTable = extractTableName('entries');
const remindersTable = extractTableName('reminders');
const devicesTable = extractTableName('devices');

const tables = [
  { name: primaryTable, displayName: primaryTable },
  { name: entriesTable, displayName: entriesTable },
  { name: remindersTable, displayName: remindersTable },
  { name: devicesTable, displayName: devicesTable },
].filter((t) => t.name);

// Generate RLS policy SQL
const generateRLSPolicies = () => {
  let sql = `-- Row Level Security (RLS) Policies
-- This file is auto-generated from DOMAIN config
-- DO NOT EDIT MANUALLY - regenerate with: npm run db:generate-rls
-- Apply this after running the Drizzle migration

`;

  // Enable RLS on all tables
  sql += '-- Enable RLS on all tables\n';
  for (const table of tables) {
    sql += `alter table public.${table.name} enable row level security;\n`;
  }

  sql += '\n-- Drop existing policies if they exist (for re-running)\n';
  for (const table of tables) {
    sql += `drop policy if exists "Users can manage their own ${table.displayName}" on public.${table.name};\n`;
  }

  sql += '\n-- Create policies for each table\n';
  for (const table of tables) {
    sql += `create policy "Users can manage their own ${table.displayName}"
  on public.${table.name}
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

`;
  }

  return sql;
};

// Write to file
const outputPath = path.join(rootDir, 'src/db/postgres/rls-policies.sql');
const sql = generateRLSPolicies();

fs.writeFileSync(outputPath, sql, 'utf8');

console.log('✅ Generated RLS policies at:', outputPath);
console.log(`📋 Found ${tables.length} tables:`, tables.map((t) => t.name).join(', '));
