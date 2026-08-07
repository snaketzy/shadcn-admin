/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { closePool, describeTable, execute, listTables, query } from './db'

const XLSX_PATH = path.resolve(
  process.cwd(),
  'assets/database_structure/vessel_list.xlsx'
)
const TABLE_NAME = 'vessel_list'
const BATCH_SIZE = 50

type VesselListRow = {
  vessel_name: string
  building_year: string | Date | null
  vessel_imo: number | null
  vessel_loa: string | null
  vessel_breadth: string | null
  vessel_gross: number | null
  vessel_dwt: number | null
  vessel_class: string | null
  vessel_flag: string | null
  vessel_team: string | null
  vessel_incharge: string | null
}

function readExcel(): VesselListRow[] {
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
  const rows = XLSX.utils.sheet_to_json<VesselListRow>(sheet, {
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
      \`vessel_id\`      INT            NOT NULL AUTO_INCREMENT COMMENT '船ID（自增，vessel_name+imo 建议唯一）',
      \`vessel_name\`    VARCHAR(128)   NOT NULL COMMENT '船名',
      \`building_year\`  DATE           NULL     COMMENT '建造日期',
      \`vessel_imo\`     BIGINT         NULL     COMMENT 'IMO 编号',
      \`vessel_loa\`     VARCHAR(32)    NULL     COMMENT '总长（如 240.00m）',
      \`vessel_breadth\` VARCHAR(32)    NULL     COMMENT '型宽（如 38.00m）',
      \`vessel_gross\`   INT            NULL     COMMENT '总吨 GT',
      \`vessel_dwt\`     INT            NULL     COMMENT '载重吨 DWT',
      \`vessel_class\`   VARCHAR(64)    NULL     COMMENT '船级社',
      \`vessel_flag\`    VARCHAR(64)    NULL     COMMENT '船旗国',
      \`vessel_team\`    VARCHAR(16)    NULL     COMMENT '所属分组/小队',
      \`vessel_incharge\` VARCHAR(64)   NULL     COMMENT '负责人',
      PRIMARY KEY (\`vessel_id\`),
      UNIQUE KEY \`uk_name_imo\` (\`vessel_name\`, \`vessel_imo\`),
      KEY \`idx_flag\` (\`vessel_flag\`),
      KEY \`idx_team\` (\`vessel_team\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='船舶列表';
  `
  await execute(createSql)
  return { created: true }
}

async function upgradeTableSchema(): Promise<string[]> {
  const info = await describeTable(TABLE_NAME)
  const byName = new Map(info.columns.map((c) => [c.field, c]))

  const spec: Array<{ col: string; def: string }> = [
    { col: 'vessel_id', def: 'INT NOT NULL AUTO_INCREMENT COMMENT \'船ID\'' },
    { col: 'vessel_name', def: 'VARCHAR(128) NOT NULL COMMENT \'船名\'' },
    { col: 'building_year', def: 'DATE NULL COMMENT \'建造日期\'' },
    { col: 'vessel_imo', def: 'BIGINT NULL COMMENT \'IMO 编号\'' },
    { col: 'vessel_loa', def: 'VARCHAR(32) NULL COMMENT \'总长\'' },
    { col: 'vessel_breadth', def: 'VARCHAR(32) NULL COMMENT \'型宽\'' },
    { col: 'vessel_gross', def: 'INT NULL COMMENT \'总吨 GT\'' },
    { col: 'vessel_dwt', def: 'INT NULL COMMENT \'载重吨 DWT\'' },
    { col: 'vessel_class', def: 'VARCHAR(64) NULL COMMENT \'船级社\'' },
    { col: 'vessel_flag', def: 'VARCHAR(64) NULL COMMENT \'船旗国\'' },
    { col: 'vessel_team', def: 'VARCHAR(16) NULL COMMENT \'所属分组/小队\'' },
    { col: 'vessel_incharge', def: 'VARCHAR(64) NULL COMMENT \'负责人\'' },
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

function normalizeBuildingYear(v: string | Date | null): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v).trim()
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return s
}

function trimStrOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function intOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

async function insertBatch(rows: VesselListRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      trimStrOrNull(r.vessel_name) ?? '',
      normalizeBuildingYear(r.building_year),
      intOrNull(r.vessel_imo),
      trimStrOrNull(r.vessel_loa),
      trimStrOrNull(r.vessel_breadth),
      intOrNull(r.vessel_gross),
      intOrNull(r.vessel_dwt),
      trimStrOrNull(r.vessel_class),
      trimStrOrNull(r.vessel_flag),
      trimStrOrNull(r.vessel_team),
      trimStrOrNull(r.vessel_incharge)
    )
  }
  const sql = `INSERT INTO \`${TABLE_NAME}\`
    (\`vessel_name\`, \`building_year\`, \`vessel_imo\`,
     \`vessel_loa\`, \`vessel_breadth\`, \`vessel_gross\`,
     \`vessel_dwt\`, \`vessel_class\`, \`vessel_flag\`,
     \`vessel_team\`, \`vessel_incharge\`)
    VALUES ${placeholders}`
  const result = await execute(sql, params as any)
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
  console.log(
    `✅ 读取成功，共 ${rows.length} 行，列: ${headers.join(', ')}\n`
  )

  console.log('[2/6] 连接数据库并检查表是否存在 ...')
  const { created } = await ensureTableExists()
  console.log(created ? `✅ 已自动建表 \`${TABLE_NAME}\`` : `ℹ️  表 \`${TABLE_NAME}\` 已存在`)
  const info = await describeTable(TABLE_NAME)
  const existingCols = new Set(info.columns.map((c) => c.field))
  const missing = headers.filter((h) => !existingCols.has(h))
  if (missing.length > 0) {
    console.error(
      `❌ 目标表缺少列: ${missing.join(', ')}; 当前: ${info.columns
        .map((c) => c.field)
        .join(', ')}`
    )
    process.exitCode = 1
    return
  }
  console.log()

  console.log('[3/6] 同步表结构（按需扩容 VARCHAR / 补充缺失列）...')
  const applied = await upgradeTableSchema()
  console.log(
    applied.length > 0
      ? `✅ 已同步字段: ${applied.join(', ')}`
      : 'ℹ️  字段已是目标结构'
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
    console.log(
      `   第 ${String(Math.floor(i / BATCH_SIZE) + 1).padStart(2)} 批: 插入 ${n} 行`
    )
  }
  console.log(`✅ 共插入 ${inserted} 行\n`)

  console.log('[6/6] 验证导入结果 ...')
  const countRows = await query<[{ total: number }]>(
    `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``
  )
  const total = countRows[0]?.total ?? 0
  console.log(`   数据库实际行数: ${total}`)

  const sample = await query<Array<Record<string, unknown>>>(
    `SELECT vessel_id, vessel_name, building_year, vessel_imo, vessel_loa, vessel_breadth,
            vessel_gross, vessel_dwt, vessel_class, vessel_flag, vessel_team, vessel_incharge
     FROM \`${TABLE_NAME}\` ORDER BY vessel_id LIMIT 3`
  )
  console.log('   前 3 行样例:')
  sample.forEach((r, i) => {
    console.log(
      `     #${i + 1}  ${r.vessel_name} | 建造:${String(r.building_year ?? '-').slice(0, 10)} | IMO:${r.vessel_imo ?? '-'} | ${r.vessel_loa}×${r.vessel_breadth} | ${r.vessel_gross}GT / ${r.vessel_dwt}DWT | ${r.vessel_class ?? '-'} | ${r.vessel_flag ?? '-'} | Team:${r.vessel_team ?? '-'} | ${r.vessel_incharge ?? '-'}`
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
