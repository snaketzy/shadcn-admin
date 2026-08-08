/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query, type ExecuteValues } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/supplier_list.xlsx'
)
const TABLE_NAME = 'supplier_list'
const BATCH_SIZE = 50

type SupplierListRow = {
  supplier_name: string | null
  supplier_shortname: string | null
  supplier_address: string | null
  supplier_field: string | null
  supplier_advantage: string | null
  supplier_contact_name: string | null
  supplier_contact_phone: string | number | null
  supplier_contact_email: string | null
  supplier_remark: string | null
}

function readExcel(): SupplierListRow[] {
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
    supplier_name: r.supplier_name ?? null,
    supplier_shortname: r.supplier_shortname ?? null,
    supplier_address: r.supplier_address ?? null,
    supplier_field: r.supplier_field ?? null,
    supplier_advantage: r.supplier_advantage ?? null,
    supplier_contact_name: r.supplier_contact_name ?? null,
    supplier_contact_phone: r.supplier_contact_phone ?? null,
    supplier_contact_email: r.supplier_contact_email ?? null,
    supplier_remark: r.supplier_remark ?? null,
  }))
}

async function ensureTableExists(): Promise<{ created: boolean }> {
  const tables = await listTables()
  if (tables.includes(TABLE_NAME)) return { created: false }
  const createSql = `
    CREATE TABLE \`${TABLE_NAME}\` (
      \`supplier_id\`              INT            NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
      \`supplier_name\`            VARCHAR(255)   NULL     COMMENT '供应商全称',
      \`supplier_shortname\`       VARCHAR(128)   NULL     COMMENT '供应商简称',
      \`supplier_address\`         VARCHAR(500)   NULL     COMMENT '供应商地址',
      \`supplier_field\`           VARCHAR(128)   NULL     COMMENT '业务领域/字段',
      \`supplier_advantage\`       VARCHAR(255)   NULL     COMMENT '优势业务/产品',
      \`supplier_contact_name\`    VARCHAR(128)   NULL     COMMENT '联系人姓名',
      \`supplier_contact_phone\`   VARCHAR(64)    NULL     COMMENT '联系人电话',
      \`supplier_contact_email\`   VARCHAR(255)   NULL     COMMENT '联系人邮箱',
      \`supplier_remark\`          VARCHAR(500)   NULL     COMMENT '备注',
      PRIMARY KEY (\`supplier_id\`),
      KEY \`idx_name\` (\`supplier_name\`),
      KEY \`idx_field\` (\`supplier_field\`),
      KEY \`idx_advantage\` (\`supplier_advantage\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='供应商列表';
  `
  await execute(createSql)
  return { created: true }
}

async function upgradeTableSchema(): Promise<string[]> {
  const info = await describeTable(TABLE_NAME)
  const byName = new Map(info.columns.map((c) => [c.field, c]))
  const spec: Array<{ col: string; def: string }> = [
    { col: 'supplier_id',              def: 'INT NOT NULL AUTO_INCREMENT COMMENT \'供应商ID\'' },
    { col: 'supplier_name',            def: 'VARCHAR(255) NULL COMMENT \'供应商全称\'' },
    { col: 'supplier_shortname',       def: 'VARCHAR(128) NULL COMMENT \'供应商简称\'' },
    { col: 'supplier_address',         def: 'VARCHAR(500) NULL COMMENT \'供应商地址\'' },
    { col: 'supplier_field',           def: 'VARCHAR(128) NULL COMMENT \'业务领域/字段\'' },
    { col: 'supplier_advantage',       def: 'VARCHAR(255) NULL COMMENT \'优势业务/产品\'' },
    { col: 'supplier_contact_name',    def: 'VARCHAR(128) NULL COMMENT \'联系人姓名\'' },
    { col: 'supplier_contact_phone',   def: 'VARCHAR(64) NULL COMMENT \'联系人电话\'' },
    { col: 'supplier_contact_email',   def: 'VARCHAR(255) NULL COMMENT \'联系人邮箱\'' },
    { col: 'supplier_remark',          def: 'VARCHAR(500) NULL COMMENT \'备注\'' },
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

async function insertBatch(rows: SupplierListRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      strOrNull(r.supplier_name),
      strOrNull(r.supplier_shortname),
      strOrNull(r.supplier_address),
      strOrNull(r.supplier_field),
      strOrNull(r.supplier_advantage),
      strOrNull(r.supplier_contact_name),
      strOrNull(r.supplier_contact_phone),
      strOrNull(r.supplier_contact_email),
      strOrNull(r.supplier_remark)
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`supplier_name\`, \`supplier_shortname\`, \`supplier_address\`,
     \`supplier_field\`, \`supplier_advantage\`, \`supplier_contact_name\`,
     \`supplier_contact_phone\`, \`supplier_contact_email\`, \`supplier_remark\`)
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
    `SELECT supplier_id, supplier_name, supplier_shortname, supplier_field, supplier_advantage,
            supplier_contact_name, supplier_contact_email, supplier_remark
     FROM \`${TABLE_NAME}\` ORDER BY supplier_id LIMIT 5`
  )
  console.log('   前 5 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  ${String(r.supplier_name ?? '-').padEnd(20)} short=${String(r.supplier_shortname ?? '-').padEnd(16)} field=${String(r.supplier_field ?? '-').padEnd(12)} adv=${String(r.supplier_advantage ?? '-').padEnd(10)} contact=${String(r.supplier_contact_name ?? '-').padEnd(16)} email=${r.supplier_contact_email ?? '-'} remark=${r.supplier_remark ?? '-'}`
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
