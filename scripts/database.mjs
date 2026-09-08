import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const mode = process.argv[2];
if (!['--check', '--migrate'].includes(mode)) {
  throw new Error('Use --check (read only) or --migrate (additive schema only).');
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
const sql = neon(process.env.DATABASE_URL);
const schema = (await readFile(new URL('./schema.sql', import.meta.url), 'utf8'))
  .replace(/^--.*$/gm, '').split(';').map(statement => statement.trim()).filter(Boolean);

if (mode === '--migrate') {
  // Explicit operator action only. No seeds, content updates, drops, or resets.
  for (const statement of schema) {
    if (!/^(CREATE (TABLE|INDEX) IF NOT EXISTS|ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS)\b/.test(statement)) {
      throw new Error('Only additive schema statements are allowed');
    }
  }
  await sql.transaction(tx => schema.map(statement => tx.query(statement)), {
    fetchOptions: { signal: AbortSignal.timeout(60000) },
  });
  console.log('Additive schema migration completed; existing content preserved.');
} else {
  // Fail a deployment before promotion if a required table/column is missing.
  // LIMIT 0 checks the schema without reading student records or modifying data.
  const tables = new Map();
  for (const statement of schema) {
    const create = statement.match(/^CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*)\)$/);
    if (create) {
      const columns = new Set([...create[2].matchAll(/(?:^|[,\n])\s*(\w+)\s+(?:TEXT|JSONB|BOOLEAN|INTEGER|TIMESTAMPTZ|DOUBLE PRECISION)\b/g)].map(match => match[1]));
      tables.set(create[1], columns);
    }
    const alter = statement.match(/^ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+)/);
    if (alter) tables.get(alter[1]).add(alter[2]);
  }
  await sql.transaction(tx => [...tables].map(([table, columns]) =>
    tx.query(`SELECT ${[...columns].join(', ')} FROM ${table} LIMIT 0`)), {
    readOnly: true,
    fetchOptions: { signal: AbortSignal.timeout(15000) },
  });
  console.log(`Database schema verified (${tables.size} tables, read only).`);
}
