/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/agent_list.xlsx'
)
const TABLE_NAME = 'agent_list'
const BATCH_SIZE = 100

type AgentListRow = {
  agent_id: number
  agent_company_name: string
  agent_company_shortname: string
  agent_incharge_name: string
  agent_company_address: string | null
  agent_incharge_phone: string | number | null
  agent_incharge_email: string | null
}

function readExcel(): AgentListRow[] {
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
  const rows = XLSX.utils.sheet_to_json<AgentListRow>(sheet, {
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
      \`agent_id\`                  INT           NOT NULL COMMENT '代理公司ID',
      \`agent_company_name\`        VARCHAR(255)  NOT NULL COMMENT '公司全称',
      \`agent_company_shortname\`   VARCHAR(128)  NOT NULL COMMENT '公司简称',
      \`agent_incharge_name\`       VARCHAR(128)  NOT NULL COMMENT '负责人姓名',
      \`agent_company_address\`     VARCHAR(500)  NULL     COMMENT '公司地址',
      \`agent_incharge_phone\`      VARCHAR(64)   NULL     COMMENT '负责人电话（含空格或区号也可存）',
      \`agent_incharge_email\`      VARCHAR(255)  NULL     COMMENT '负责人邮箱',
      PRIMARY KEY (\`agent_id\`),
      KEY \`idx_company_name\` (\`agent_company_name\`),
      KEY \`idx_phone\` (\`agent_incharge_phone\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='船舶代理公司列表';
  `
  await execute(createSql)
  return { created: true }
}

async function upgradeTableSchema(): Promise<string[]> {
  const info = await describeTable(TABLE_NAME)
  const byName = new Map(info.columns.map((c) => [c.field, c]))
  const alters: Array<{ col: string; def: string }> = [
    {
      col: 'agent_company_name',
      def: 'VARCHAR(255) NOT NULL COMMENT \'公司全称\'',
    },
    {
      col: 'agent_company_shortname',
      def: 'VARCHAR(128) NOT NULL COMMENT \'公司简称\'',
    },
    {
      col: 'agent_incharge_name',
      def: 'VARCHAR(128) NOT NULL COMMENT \'负责人姓名\'',
    },
    {
      col: 'agent_company_address',
      def: 'VARCHAR(500) NULL COMMENT \'公司地址\'',
    },
    {
      col: 'agent_incharge_phone',
      def: 'VARCHAR(64) NULL COMMENT \'负责人电话（含空格或区号也可存）\'',
    },
    {
      col: 'agent_incharge_email',
      def: 'VARCHAR(255) NULL COMMENT \'负责人邮箱\'',
    },
  ]
  const applied: string[] = []
  for (const { col, def } of alters) {
    const existing = byName.get(col)
    if (!existing) {
      await execute(`ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${col}\` ${def}`)
      applied.push(`ADD ${col}`)
    } else {
      await execute(`ALTER TABLE \`${TABLE_NAME}\` MODIFY COLUMN \`${col}\` ${def}`)
      applied.push(`MODIFY ${col}`)
    }
  }
  return applied
}

async function truncateTable(): Promise<void> {
  await execute(`TRUNCATE TABLE \`${TABLE_NAME}\``)
}

function sanitizePhone(v: string | number | null): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return String(v)
  return String(v).trim() || null
}

async function insertBatch(rows: AgentListRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      r.agent_id,
      r.agent_company_name ?? '',
      r.agent_company_shortname ?? '',
      r.agent_incharge_name ?? '',
      r.agent_company_address === null || r.agent_company_address === ''
        ? null
        : String(r.agent_company_address),
      sanitizePhone(r.agent_incharge_phone),
      r.agent_incharge_email === null ||
      r.agent_incharge_email === undefined ||
      r.agent_incharge_email === ''
        ? null
        : String(r.agent_incharge_email)
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`agent_id\`, \`agent_company_name\`, \`agent_company_shortname\`,
     \`agent_incharge_name\`, \`agent_company_address\`,
     \`agent_incharge_phone\`, \`agent_incharge_email\`)
    VALUES ${placeholders}`
  const result = await execute(sql, params)
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

  console.log('[2/6] 连接数据库并检查表是否存在 ...')
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

  console.log('[3/6] 同步表结构（按需扩容 VARCHAR 长度/补充缺失列）...')
  const applied = await upgradeTableSchema()
  console.log(
    applied.length > 0
      ? `✅ 已同步字段: ${applied.join(', ')}`
      : 'ℹ️  字段已是目标结构\n'
  )
  console.log()

  console.log('[4/6] 清空目标表数据（TRUNCATE）...')
  await truncateTable()
  console.log('✅ 已清空旧数据\n')

  console.log(`[5/6] 开始批量插入（每批 ${BATCH_SIZE} 行）...`)
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const n = await insertBatch(batch)
    inserted += n
    console.log(`   第 ${Math.floor(i / BATCH_SIZE) + 1} 批: 插入 ${n} 行`)
  }
  console.log(`✅ 共插入 ${inserted} 行\n`)

  console.log('[6/6] 验证导入结果 ...')
  const countRows = await query<[{ total: number }]>(
    `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``
  )
  const total = countRows[0]?.total ?? 0
  console.log(`   数据库实际行数: ${total}`)

  const sample = await query<AgentListRow[]>(
    `SELECT agent_id, agent_company_name, agent_company_shortname,
            agent_incharge_name, agent_company_address,
            agent_incharge_phone, agent_incharge_email
     FROM \`${TABLE_NAME}\` ORDER BY agent_id LIMIT 3`
  )
  console.log('   前 3 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  id=${r.agent_id}  ${r.agent_company_shortname}  ${r.agent_incharge_name}  ${r.agent_incharge_phone ?? '-'}  ${r.agent_incharge_email ?? '-'}`
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
