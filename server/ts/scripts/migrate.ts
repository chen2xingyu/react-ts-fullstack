/**
 * 迁移执行器：顺序执行 migrations/*.sql
 * 用法：npm run db:migrate
 */
import '../load-env.js'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import mysql from 'mysql2/promise'

const here = dirname(fileURLToPath(import.meta.url))

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'react_ts_db',
    // 迁移文件内含多条 DDL，需要一次性多语句执行
    multipleStatements: true,
    charset: 'utf8mb4',
  })

  try {
    const dir = join(here, '..', 'migrations')
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      const sql = await readFile(join(dir, file), 'utf-8')
      console.log(`▶ 执行迁移 ${file}`)
      await conn.query(sql)
      console.log(`  ✅ 完成`)
    }
    console.log('🎉 全部迁移完成')
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('❌ 迁移失败:', err.message)
  process.exit(1)
})
