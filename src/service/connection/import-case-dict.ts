/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query, type ExecuteValues } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/case_dict.xlsx'
)
const TABLE_NAME = 'case_dict'
const BATCH_SIZE = 100

type CaseDictRow = {
  dict_id: number
  dict_group: string
  dict_value: string
  dict_key: number
}

function readExcel(): CaseDictRow[] {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Excel 文件不存在: ${XLSX_PATH}`)
  }
  const buffer = fs.readFileSync(XLSX_PATH)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel 中没有找到工作表')
  }
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<CaseDictRow>(sheet, {
    defval: null,
    raw: true,
  })
  return rows
}

async function ensureTableExists(): Promise<{ created: boolean }> {
  const tables = await listTables()
  if (tables.includes(TABLE_NAME)) {
    return { created: false }
  }
  const createSql = `
    CREATE TABLE \`${TABLE_NAME}\` (
      \`dict_id\`    INT           NOT NULL COMMENT '字典ID',
      \`dict_group\` VARCHAR(255)  NOT NULL COMMENT '字典分组名称',
      \`dict_value\` VARCHAR(255)  NOT NULL COMMENT '字典值（显示文本）',
      \`dict_key\`   INT           NOT NULL COMMENT '字典键（业务编码）',
      PRIMARY KEY (\`dict_id\`),
      KEY \`idx_group\` (\`dict_group\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='案例字典表';
  `
  await execute(createSql)
  return { created: true }
}

async function truncateTable(): Promise<void> {
  await execute(`TRUNCATE TABLE \`${TABLE_NAME}\``)
}

async function insertBatch(rows: CaseDictRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?)').join(', ')
  const params: (string | number)[] = []
  for (const r of rows) {
    params.push(
      r.dict_id,
      r.dict_group === null ? '' : String(r.dict_group ?? ''),
      r.dict_value === null ? '' : String(r.dict_value ?? ''),
      r.dict_key
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`dict_id\`, \`dict_group\`, \`dict_value\`, \`dict_key\`)
    VALUES ${placeholders}`
  const result = await execute(sql, params as ExecuteValues)
  return Number(result.affectedRows)
}

async function main() {
  console.log(`=== 导入 ${TABLE_NAME} ===`)
  console.log(`Excel 路径: ${XLSX_PATH}\n`)

  console.log('[1/5] 读取 Excel ...')
  const rows = readExcel()
  if (rows.length === 0) {
    console.error('❌ Excel 中没有数据')
    process.exitCode = 1
    return
  }
  const headers = Object.keys(rows[0])
  console.log(
    `✅ 读取成功，共 ${rows.length} 行，列: ${headers.join(', ')}\n`
  )

  console.log('[2/5] 连接数据库并检查表是否存在 ...')
  const { created } = await ensureTableExists()
  if (created) {
    console.log(`✅ 已自动建表 \`${TABLE_NAME}\``)
  } else {
    console.log(`ℹ️  表 \`${TABLE_NAME}\` 已存在`)
    const info = await describeTable(TABLE_NAME)
    const existingCols = new Set(info.columns.map((c) => c.field))
    const missing = headers.filter((h) => !existingCols.has(h))
    if (missing.length > 0) {
      console.error(
        `❌ 目标表缺少列: ${missing.join(', ')}; 当前表字段: ${info.columns
          .map((c) => c.field)
          .join(', ')}`
      )
      process.exitCode = 1
      return
    }
  }
  console.log()

  console.log('[3/5] 清空目标表数据（TRUNCATE）...')
  await truncateTable()
  console.log('✅ 已清空旧数据\n')

  console.log(`[4/5] 开始批量插入（每批 ${BATCH_SIZE} 行）...`)
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const n = await insertBatch(batch)
    inserted += n
    console.log(`   第 ${Math.floor(i / BATCH_SIZE) + 1} 批: 插入 ${n} 行`)
  }
  console.log(`✅ 共插入 ${inserted} 行\n`)

  console.log('[5/5] 验证导入结果 ...')
  const countRows = await query<[{ total: number }]>(
    `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``
  )
  const total = countRows[0]?.total ?? 0
  console.log(`   数据库实际行数: ${total}`)

  const sample = await query<CaseDictRow[]>(
    `SELECT dict_id, dict_group, dict_value, dict_key
     FROM \`${TABLE_NAME}\` ORDER BY dict_id LIMIT 3`
  )
  console.log('   前 3 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  dict_id=${r.dict_id}, dict_group=${r.dict_group}, ` +
        `dict_value=${r.dict_value}, dict_key=${r.dict_key}`
    )
  })

  if (total !== rows.length) {
    console.error(
      `\n❌ 行数不匹配! Excel=${rows.length} vs DB=${total}`
    )
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
