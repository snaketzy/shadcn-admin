/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'vessel_list'

type Cnt = { c: number }
type VesselRow = {
  vessel_id: number
  vessel_name: string | null
  vessel_loa: string | null
  vessel_breadth: string | null
}

async function countLikeM(col: string): Promise<number> {
  const r = await query<Cnt[]>(
    `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\`
     WHERE CAST(\`${col}\` AS CHAR) LIKE '%m' OR CAST(\`${col}\` AS CHAR) LIKE '%M'`
  )
  return Number(r[0]?.c ?? 0)
}

async function sampleRows(label: string, limit = 8): Promise<void> {
  const rows = await query<VesselRow[]>(
    `SELECT vessel_id, vessel_name, vessel_loa, vessel_breadth
     FROM \`${TABLE_NAME}\`
     WHERE (CAST(vessel_loa AS CHAR) LIKE '%m' OR CAST(vessel_loa AS CHAR) LIKE '%M'
         OR CAST(vessel_breadth AS CHAR) LIKE '%m' OR CAST(vessel_breadth AS CHAR) LIKE '%M')
        OR (vessel_loa IS NOT NULL AND vessel_breadth IS NOT NULL)
     ORDER BY vessel_id LIMIT ?`,
    [limit] as any
  )
  console.log(`\n${label} (样例 ${rows.length} 条):`)
  if (rows.length === 0) {
    console.log('  (无匹配)')
    return
  }
  rows.forEach((r) => {
    const loa = r.vessel_loa == null ? 'NULL' : String(r.vessel_loa)
    const br = r.vessel_breadth == null ? 'NULL' : String(r.vessel_breadth)
    const tagLoa = /[mM]$/.test(loa) ? ' [带m]' : ''
    const tagBr = /[mM]$/.test(br) ? ' [带m]' : ''
    console.log(
      `  #${String(r.vessel_id).padStart(2)} ${String(r.vessel_name ?? '').padEnd(24)}  LOA=${loa.padEnd(12)}${tagLoa}  BEAM=${br.padEnd(12)}${tagBr}`
    )
  })
}

function stripTrailingM(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '') return null
  return s.replace(/[mM]+$/, '').trim() || s
}

async function main() {
  console.log(`=== 更新 ${TABLE_NAME}.vessel_loa / vessel_breadth: 去尾部 m/M ===\n`)

  console.log('--- 更新前统计 ---')
  const [beforeLoa, beforeBr] = await Promise.all([
    countLikeM('vessel_loa'),
    countLikeM('vessel_breadth'),
  ])
  console.log(`  vessel_loa 以 m/M 结尾: ${beforeLoa} 行`)
  console.log(`  vessel_breadth 以 m/M 结尾: ${beforeBr} 行`)
  await sampleRows('更新前样例（优先带 m）')

  // 方案：逐行 SELECT 出需要改的主键，再用 prepared statement UPDATE
  // 这样既能精确统计 changed 行，又不会受 REGEXP/trim 函数版本兼容问题影响。
  console.log('\n--- 逐行规范化更新 ---')
  const all = await query<VesselRow[]>(
    `SELECT vessel_id, vessel_name, vessel_loa, vessel_breadth FROM \`${TABLE_NAME}\` ORDER BY vessel_id`
  )
  console.log(`  扫描行数: ${all.length}`)

  let loaChanged = 0
  let brChanged = 0
  let touched = 0
  for (const r of all) {
    const oldLoa = r.vessel_loa == null ? null : String(r.vessel_loa).trim() || null
    const oldBr = r.vessel_breadth == null ? null : String(r.vessel_breadth).trim() || null
    const newLoa = stripTrailingM(oldLoa)
    const newBr = stripTrailingM(oldBr)
    const loaDiff = oldLoa !== newLoa
    const brDiff = oldBr !== newBr
    if (!loaDiff && !brDiff) continue

    const sets: string[] = []
    const params: (string | number | null)[] = []
    if (loaDiff) {
      sets.push('`vessel_loa` = ?')
      params.push(newLoa)
    }
    if (brDiff) {
      sets.push('`vessel_breadth` = ?')
      params.push(newBr)
    }
    params.push(Number(r.vessel_id))
    const sql = `UPDATE \`${TABLE_NAME}\` SET ${sets.join(', ')} WHERE vessel_id = ?`
    const res = await execute(sql, params as any)
    const affected = Number(res.affectedRows ?? 0)
    if (affected > 0) {
      touched++
      if (loaDiff) loaChanged++
      if (brDiff) brChanged++
      if (touched <= 10) {
        const name = r.vessel_name ?? ''
        console.log(
          `  #${r.vessel_id} ${name.padEnd(24)} LOA: ${JSON.stringify(oldLoa)}→${JSON.stringify(newLoa)}   BEAM: ${JSON.stringify(oldBr)}→${JSON.stringify(newBr)}`
        )
      }
    }
  }
  console.log(`\n  共更新 ${touched} 行；其中 vessel_loa 变化 ${loaChanged} 行, vessel_breadth 变化 ${brChanged} 行`)
  if (touched > 10) console.log('  (仅展示前 10 条明细)')

  console.log('\n--- 更新后校验 ---')
  const [afterLoa, afterBr] = await Promise.all([
    countLikeM('vessel_loa'),
    countLikeM('vessel_breadth'),
  ])
  console.log(`  vessel_loa 仍带 m/M: ${afterLoa}`)
  console.log(`  vessel_breadth 仍带 m/M: ${afterBr}`)

  const sample = await query<VesselRow[]>(
    `SELECT vessel_id, vessel_name, vessel_loa, vessel_breadth
     FROM \`${TABLE_NAME}\`
     WHERE vessel_loa IS NOT NULL OR vessel_breadth IS NOT NULL
     ORDER BY vessel_id LIMIT 12`
  )
  console.log('\n更新后抽样 (12 条):')
  sample.forEach((r) => {
    const loa = r.vessel_loa == null ? 'NULL' : String(r.vessel_loa)
    const br = r.vessel_breadth == null ? 'NULL' : String(r.vessel_breadth)
    console.log(
      `  #${String(r.vessel_id).padStart(2)} ${String(r.vessel_name ?? '').padEnd(24)}  LOA=${loa.padEnd(12)}  BEAM=${br.padEnd(12)}`
    )
  })

  const ok = afterLoa === 0 && afterBr === 0 && loaChanged === beforeLoa && brChanged === beforeBr
  if (!ok) {
    console.error(
      `\n❌ 校验未通过: 期望 LOA changed=${beforeLoa} / BR changed=${beforeBr} 且 剩余 0；实际 loaChanged=${loaChanged} brChanged=${brChanged} afterLoa=${afterLoa} afterBr=${afterBr}`
    )
    process.exitCode = 1
  } else {
    console.log('\n✅ 全部校验通过: 已去掉所有 vessel_loa / vessel_breadth 尾部的 m 字母')
  }
}

main()
  .catch((err) => {
    console.error('\n❌ 异常:', err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
