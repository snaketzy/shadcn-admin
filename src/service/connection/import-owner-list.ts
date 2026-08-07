/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/owner_list.xlsx'
)
const TABLE_NAME = 'owner_list'
const BATCH_SIZE = 50

type OwnerListRow = {
  owner_name: string | null
  onwer_email: string | null
  owner_phone: string | number | null
  owner_team: string | null
  owner_department: string | null
  owner_department_email: string | null
  owner_rank: string | null
}

function readExcel(): OwnerListRow[] {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Excel 文件不存在: ${XLSX_PATH}`)
  }
  const buffer = fs.readFileSync(XLSX_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel 中没有找到工作表')
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<OwnerListRow>(sheet, {
    defval: null,
    raw: true,
  })
  return rows
}

async function ensureTableExists(): Promise<{ created: boolean }> {
  const tables = await listTables()
  if (tables.includes(TABLE_NAME)) return { created: false }
  const createSql = `
    CREATE TABLE \`${TABLE_NAME}\` (
      \`owner_id\`                 INT            NOT NULL AUTO_INCREMENT COMMENT '负责人ID',
      \`owner_name\`               VARCHAR(128)   NULL     COMMENT '负责人姓名',
      \`onwer_email\`              VARCHAR(255)   NULL     COMMENT '负责人邮箱（Excel 拼写 onwer，原样保留）',
      \`owner_phone\`              VARCHAR(64)    NULL     COMMENT '负责人电话',
      \`owner_team\`               VARCHAR(32)    NULL     COMMENT '所属组/小队',
      \`owner_department\`         VARCHAR(32)    NULL     COMMENT '部门代码',
      \`owner_department_email\`   VARCHAR(255)   NULL     COMMENT '部门公共邮箱',
      \`owner_rank\`               VARCHAR(32)    NULL     COMMENT '职级',
      PRIMARY KEY (\`owner_id\`),
      KEY \`idx_team\` (\`owner_team\`),
      KEY \`idx_department\` (\`owner_department\`),
      KEY \`idx_name\` (\`owner_name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='船东/业务负责人列表';
  `
  await execute(createSql)
  return { created: true }
}

async function upgradeTableSchema(): Promise<string[]> {
  const info = await describeTable(TABLE_NAME)
  const byName = new Map(info.columns.map((c) => [c.field, c]))
  const spec: Array<{ col: string; def: string }> = [
    { col: 'owner_id',               def: 'INT NOT NULL AUTO_INCREMENT COMMENT \'负责人ID\'' },
    { col: 'owner_name',             def: 'VARCHAR(128) NULL COMMENT \'负责人姓名\'' },
    { col: 'onwer_email',            def: 'VARCHAR(255) NULL COMMENT \'负责人邮箱（Excel 拼写 onwer，原样保留）\'' },
    { col: 'owner_phone',            def: 'VARCHAR(64) NULL COMMENT \'负责人电话\'' },
    { col: 'owner_team',             def: 'VARCHAR(32) NULL COMMENT \'所属组/小队\'' },
    { col: 'owner_department',       def: 'VARCHAR(32) NULL COMMENT \'部门代码\'' },
    { col: 'owner_department_email', def: 'VARCHAR(255) NULL COMMENT \'部门公共邮箱\'' },
    { col: 'owner_rank',             def: 'VARCHAR(32) NULL COMMENT \'职级\'' },
  ]
  const applied: string[] = []
  for (const { col, def } of spec) {
    const existing = byName.get(col)
    try {
      if (!existing) {
        await execute(`ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${col}\` ${def}`)
        applied.push(`ADD ${col}`)
      } else {
        await execute(`ALTER TABLE \`${TABLE_NAME}\` MODIFY COLUMN \`${col}\` ${def}`)
        applied.push(`MODIFY ${col}`)
      }
    } catch (err) {
      if (existing && String(err).includes('AUTO_INCREMENT')) {
        applied.push(`SKIP ${col}`)
        continue
      }
      throw err
    }
  }
  return applied
}

async function truncateTable(): Promise<void> {
  await execute(`TRUNCATE TABLE \`${TABLE_NAME}\``)
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

async function insertBatch(rows: OwnerListRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      strOrNull(r.owner_name),
      strOrNull(r.onwer_email),
      strOrNull(r.owner_phone),
      strOrNull(r.owner_team),
      strOrNull(r.owner_department),
      strOrNull(r.owner_department_email),
      strOrNull(r.owner_rank)
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`owner_name\`, \`onwer_email\`, \`owner_phone\`,
     \`owner_team\`, \`owner_department\`, \`owner_department_email\`,
     \`owner_rank\`)
    VALUES ${placeholders}`
  const result = await execute(sql, params)
  return Number(result.affectedRows)
}

async function main() {
  console.log(`=== 导入 ${TABLE_NAME} ===`)
  console.log(`Excel 路径: ${XLSX_PATH}\n`)

  console.log('[1/6] 读取 Excel ...')
  const rows = readExcel()
  if (rows.length === 0) {
    console.error('❌ Excel 中没有数据')
    process.exitCode = 1
    return
  }
  const headers = Object.keys(rows[0])
  console.log(`✅ 读取成功，共 ${rows.length} 行，列: ${headers.join(', ')}\n`)

  console.log('[2/6] 连接数据库并检查表是否存在 ...')
  const { created } = await ensureTableExists()
  console.log(created ? `✅ 已自动建表 \`${TABLE_NAME}\`` : `ℹ️  表 \`${TABLE_NAME}\` 已存在`)
  const info = await describeTable(TABLE_NAME)
  const existingCols = new Set(info.columns.map((c) => c.field))
  const missing = headers.filter((h) => !existingCols.has(h))
  if (missing.length > 0) {
    console.error(
      `❌ 目标表缺少列: ${missing.join(', ')}; 当前: ${info.columns.map((c) => c.field).join(', ')}`
    )
    process.exitCode = 1
    return
  }
  console.log()

  console.log('[3/6] 同步表结构（按需扩容/补列）...')
  const applied = await upgradeTableSchema()
  console.log(
    applied.length > 0
      ? `✅ 已同步字段: ${applied.join(', ')}`
      : 'ℹ️  字段已是目标结构'
  )
  console.log()

  console.log('[4/6] 清空目标表（TRUNCATE）...')
  await truncateTable()
  console.log('✅ 已清空旧数据\n')

  console.log(`[5/6] 批量插入（每批 ${BATCH_SIZE} 行）...`)
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const n = await insertBatch(batch)
    inserted += n
    console.log(`   第 ${Math.floor(i / BATCH_SIZE) + 1} 批: 插入 ${n} 行`)
  }
  console.log(`✅ 共插入 ${inserted} 行\n`)

  console.log('[6/6] 验证导入结果 ...')
  const total = (
    await query<[{ total: number }]>(`SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``)
  )[0]?.total ?? 0
  console.log(`   数据库实际行数: ${total}`)

  const sample = await query<Array<Record<string, unknown>>>(
    `SELECT owner_id, owner_name, onwer_email, owner_phone, owner_team, owner_department, owner_department_email, owner_rank
     FROM \`${TABLE_NAME}\` ORDER BY owner_id LIMIT 5`
  )
  console.log('   前 5 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  ${String(r.owner_name).padEnd(18)} ${String(r.owner_team ?? '-').padEnd(4)} ${String(r.owner_department ?? '-').padEnd(4)} ${String(r.owner_rank ?? '-').padEnd(4)}  email=${r.onwer_email ?? '-'}  deptEmail=${r.owner_department_email ?? '-'}  phone=${r.owner_phone ?? '-'}`
    )
  })

  if (total !== rows.length) {
    console.error(`\n❌ 行数不匹配! Excel=${rows.length} vs DB=${total}`)
    process.exitCode = 1
  } else {
    console.log(`\n✅ 导入完成，行数校验通过 (${rows.length})`)
  }
}

main()
  .catch((err) => {
    console.error('\n❌ 导入异常:')
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
