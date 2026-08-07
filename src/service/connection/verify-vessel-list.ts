/* eslint-disable no-console */
import { closePool, describeTable, query } from './db'

const TABLE_NAME = 'vessel_list'

type VesselRow = {
  vessel_id: number
  vessel_name: string
  building_year: Date | string | null
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

async function main() {
  console.log(`=== ${TABLE_NAME} 表结构验证 ===\n`)
  const info = await describeTable(TABLE_NAME)
  console.log(`字段数: ${info.columnCount}`)
  console.log(`主键:   ${info.primaryKeys.join(', ')}`)
  console.log('\n字段明细:')
  for (const col of info.columns) {
    const flags = [
      col.key === 'PRI' ? 'PK' : '',
      col.key === 'UNI' ? 'UK' : '',
      col.null ? 'NULL' : 'NOT NULL',
      col.default !== null && col.default !== undefined
        ? `DEFAULT ${col.default}`
        : '',
      col.extra,
    ]
      .filter(Boolean)
      .join(' / ')
    console.log(
      `  - ${col.field.padEnd(20)} ${col.type.padEnd(20)} ${flags}`
    )
  }

  console.log(`\n=== 全量数据（${TABLE_NAME}） ===`)
  const total = await query<[{ total: number }]>(
    `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``
  )
  console.log(`总条数: ${total[0]?.total ?? 0}，按 team 分组：`)

  const teams = await query<
    { vessel_team: string | null; cnt: number }[]
  >(
    `SELECT vessel_team, COUNT(*) AS cnt FROM \`${TABLE_NAME}\` GROUP BY vessel_team ORDER BY vessel_team`
  )
  for (const t of teams) {
    console.log(`  Team ${String(t.vessel_team ?? '(空)').padEnd(4)}  ${String(t.cnt).padStart(2)} 条`)
  }

  console.log('\n=== 抽样 10 条样例：')
  const rows = await query<VesselRow[]>(
    `SELECT vessel_id, vessel_name, DATE_FORMAT(building_year, '%Y-%m-%d') AS building_year,
            vessel_imo, vessel_loa, vessel_breadth, vessel_gross, vessel_dwt,
            vessel_class, vessel_flag, vessel_team, vessel_incharge
     FROM \`${TABLE_NAME}\` ORDER BY vessel_id LIMIT 10`
  )
  for (const r of rows) {
    const ymd = r.building_year ? String(r.building_year).slice(0, 10) : '---------'
    console.log(
      `#${String(r.vessel_id).padStart(2)}  ${r.vessel_name.padEnd(26)} 造于 ${ymd.padEnd(10)} ${r.vessel_flag ? String(r.vessel_flag).trim().padEnd(14) : '(空旗)'.padEnd(16)} ${(r.vessel_class ?? '-').padEnd(6)} ${String(r.vessel_gross ?? '-').padStart(6)}GT / ${String(r.vessel_dwt ?? '-').padStart(6)}DWT  Team:${(r.vessel_team ?? '-').padEnd(4)} ${r.vessel_incharge ?? '-'}`
    )
  }
  console.log()
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
