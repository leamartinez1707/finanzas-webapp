import { Pool } from 'pg'
import * as fs from 'node:fs'
import * as path from 'node:path'

const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.gfawfpweprqydgkeuwud',
  password: process.env.DATABASE_PASSWORD!,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '001_schema.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  console.log('Connecting to Supabase...')

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split('\n').every((l) => l.trim().startsWith('--') || l.trim() === ''))

  const client = await pool.connect()
  try {
    console.log('Connected. Running', statements.length, 'statements...\n')

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.split('\n')[0].substring(0, 80)
      try {
        await client.query(stmt + ';')
        console.log(`[${i + 1}/${statements.length}] OK  ${preview}`)
      } catch (err: any) {
        if (err.code === '42P07' || err.code === '42710' || err.message.includes('already exists')) {
          console.log(`[${i + 1}/${statements.length}] SKIP ${preview}`)
        } else {
          console.error(`[${i + 1}/${statements.length}] FAIL ${preview}`)
          console.error(`  ${err.message}`)
        }
      }
    }
    console.log('\nSchema migration complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
