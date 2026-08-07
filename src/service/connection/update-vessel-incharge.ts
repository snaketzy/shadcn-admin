/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'vessel_list'
const MAP: Array<{ from: string; to: string }> = [
  { from: 'Hannah', to: '51' },
  { from: 'Jerry', to: '52' },
  { from: '1', to: '51' },
  { from: '2', to: '52' },
]

type CountRow = { cnt: number }

async function main() {
  console.log(`=== 更新 ${TABLE_NAME}.vessel_incharge ===\n`)

  console.log('[1/3] 更新前统计:')
  for (const item of MAP) {
    const before = await query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM \`${TABLE_NAME}\` WHERE \`vessel_incharge\` = ?`,
      [item.from]
    )
    const before2 = await query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM \`${TABLE_NAME}\` WHERE \`vessel_incharge\` = ?`,
      [item.to]
    )
    console.log(
      `   "${item.from}" 有 ${before[0].cnt} 条；目标 "${item.to}" 当前 ${before2[0].cnt} 条`
    )
  }
  console.log()

  console.log('[2/3] 执行 UPDATE:')
  for (const item of MAP) {
    const r = await execute(
      `UPDATE \`${TABLE_NAME}\` SET \`vessel_incharge\` = ? WHERE \`vessel_incharge\` = ?`,
      [item.to, item.from]
    )
    const matched = Number(r.info ?? 0) || Number(r.affectedRows) || 0
    const changed = Number(r.affectedRows) || 0
    console.log(
      `   "${item.from}" → "${item.to}": 匹配 ${matched} 行, 受影响 ${changed} 行`
    )
  }
  console.log()

  console.log('[3/3] 更新后复核:')
  for (const item of MAP) {
    const afterFrom = await query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM \`${TABLE_NAME}\` WHERE \`vessel_incharge\` = ?`,
      [item.from]
    )
    const afterTo = await query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM \`${TABLE_NAME}\` WHERE \`vessel_incharge\` = ?`,
      [item.to]
    )
    console.log(
      `   "${item.from}" 剩余 ${afterFrom[0].cnt} 条；"${item.to}" 现在 ${afterTo[0].cnt} 条`
    )
  }

  console.log('\n抽样检查 8 条（含 vessel_incharge）：')
  const sample = await query<
    Array<{ vessel_id: number; vessel_name: string; vessel_incharge: string | null }>
  >(
    `SELECT vessel_id, vessel_name, vessel_incharge FROM \`${TABLE_NAME}\` ORDER BY vessel_id LIMIT 8`
  )
  for (const r of sample) {
    console.log(`  #${r.vessel_id}  ${r.vessel_name.padEnd(26)} incharge=${r.vessel_incharge ?? 'NULL'}`)
  }

  console.log('\n✅ 更新完成')
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
