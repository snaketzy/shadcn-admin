/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query, type ExecuteValues } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/contact_list.xlsx'
)
const TABLE_NAME = 'contact_list'
const BATCH_SIZE = 50

type ContactListRow = {
  contact_name: string | null
  contact_mobile: string | number | null
  contact_email: string | null
  contact_type: string | null
  contact_rank: string | null
  contact_division_type: string | null
  contact_division_id: string | number | null
  contact_remark: string | null
}

function readExcel(): ContactListRow[] {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Excel 文件不存在: ${XLSX_PATH}`)
  }
  const buffer = fs.readFileSync(XLSX_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel 中没有找到工作表')
  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<any>(sheet, {
    defval: null,
    raw: true,
  })
  return rawRows.map((r: any) => ({
    contact_name: r.contact_name ?? null,
    contact_mobile: r.contact_mobile ?? null,
    contact_email: r.contact_email ?? null,
    contact_type: r.contact_type ?? null,
    contact_rank: r.contact_rank ?? null,
    contact_division_type: r.contact_division_type ?? null,
    contact_division_id: r.contact_division_id ?? null,
    contact_remark: r.contact_remark ?? null,
  }))
}

async function ensureTableExists(): Promise<{ created: boolean }> {
  const tables = await listTables()
  if (tables.includes(TABLE_NAME)) return { created: false }
  const createSql = `
    CREATE TABLE \`${TABLE_NAME}\` (
      \`contact_id\`              INT            NOT NULL AUTO_INCREMENT COMMENT '联系人ID',
      \`contact_name\`            VARCHAR(128)   NULL     COMMENT '联系人姓名',
      \`contact_mobile\`          VARCHAR(64)    NULL     COMMENT '联系人手机',
      \`contact_email\`           VARCHAR(255)   NULL     COMMENT '联系人邮箱',
      \`contact_type\`            VARCHAR(32)    NULL     COMMENT '联系人类别',
      \`contact_rank\`            VARCHAR(32)    NULL     COMMENT '联系人职级',
      \`contact_division_type\`   VARCHAR(32)    NULL     COMMENT '关联单位类别',
      \`contact_division_id\`     INT            NULL     COMMENT '关联单位ID',
      \`contact_remark\`          VARCHAR(500)   NULL     COMMENT '备注',
      PRIMARY KEY (\`contact_id\`),
      KEY \`idx_name\` (\`contact_name\`),
      KEY \`idx_type\` (\`contact_type\`),
      KEY \`idx_division\` (\`contact_division_type\`, \`contact_division_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='联系人员列表';
  `
  await execute(createSql)
  return { created: true }
}

async function upgradeTableSchema(): Promise<string[]> {
  const info = await describeTable(TABLE_NAME)
  const byName = new Map(info.columns.map((c) => [c.field, c]))
  const spec: Array<{ col: string; def: string }> = [
    { col: 'contact_id',              def: 'INT NOT NULL AUTO_INCREMENT COMMENT \'联系人ID\'' },
    { col: 'contact_name',            def: 'VARCHAR(128) NULL COMMENT \'联系人姓名\'' },
    { col: 'contact_mobile',          def: 'VARCHAR(64) NULL COMMENT \'联系人手机\'' },
    { col: 'contact_email',           def: 'VARCHAR(255) NULL COMMENT \'联系人邮箱\'' },
    { col: 'contact_type',            def: 'VARCHAR(32) NULL COMMENT \'联系人类别\'' },
    { col: 'contact_rank',            def: 'VARCHAR(32) NULL COMMENT \'联系人职级\'' },
    { col: 'contact_division_type',   def: 'VARCHAR(32) NULL COMMENT \'关联单位类别\'' },
    { col: 'contact_division_id',     def: 'INT NULL COMMENT \'关联单位ID\'' },
    { col: 'contact_remark',          def: 'VARCHAR(500) NULL COMMENT \'备注\'' },
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

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') {
    return Number.isFinite(v) ? Math.trunc(v) : null
  }
  const s = String(v).trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

async function insertBatch(rows: ContactListRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      strOrNull(r.contact_name),
      strOrNull(r.contact_mobile),
      strOrNull(r.contact_email),
      strOrNull(r.contact_type),
      strOrNull(r.contact_rank),
      strOrNull(r.contact_division_type),
      intOrNull(r.contact_division_id),
      strOrNull(r.contact_remark)
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`contact_name\`, \`contact_mobile\`, \`contact_email\`,
     \`contact_type\`, \`contact_rank\`, \`contact_division_type\`,
     \`contact_division_id\`, \`contact_remark\`)
    VALUES ${placeholders}`
  const result = await execute(sql, params as ExecuteValues)
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
    `SELECT contact_id, contact_name, contact_mobile, contact_email, contact_type,
            contact_rank, contact_division_type, contact_division_id, contact_remark
     FROM \`${TABLE_NAME}\` ORDER BY contact_id LIMIT 5`
  )
  console.log('   前 5 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  ${String(r.contact_name ?? '-').padEnd(28)} type=${String(r.contact_type ?? '-').padEnd(4)} mobile=${String(r.contact_mobile ?? '-').padEnd(16)} email=${String(r.contact_email ?? '-').padEnd(36)} divType=${String(r.contact_division_type ?? '-').padEnd(6)} divId=${r.contact_division_id ?? '-'} remark=${r.contact_remark ?? '-'}`
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
