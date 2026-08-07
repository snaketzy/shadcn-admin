/* eslint-disable no-console */
import { closePool, query } from './db'

const TABLE_NAME = 'vessel_list'

type DistRow = { incharge: string | null; cnt: number }

async function main() {
  console.log(`=== ${TABLE_NAME}.vessel_incharge 当前分布 ===\n`)
  const rows = await query<DistRow[]>(
    `SELECT COALESCE(vessel_incharge,'(NULL)') AS incharge, COUNT(*) AS cnt
     FROM \`${TABLE_NAME}\` GROUP BY vessel_incharge ORDER BY cnt DESC`
  )
  for (const r of rows) {
    console.log(`  ${String(r.incharge).padEnd(8)}  ${r.cnt} 条`)
  }
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
