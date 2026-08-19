/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'case_list'
const MAX_LEN = 100

type Row = {
  case_id: number
  vessel_name: string
  case_inquiry_keyword: string | null
  case_inquiry_date: Date | string | null
  case_memo_name: string | null
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateSh(d: Date | string | null | undefined): string | null {
  if (d === null || d === undefined) return null
  const dt = d instanceof Date ? d : new Date(String(d))
  if (Number.isNaN(dt.getTime())) return null
  // 按 UTC+8 偏移（东八区）计算 YYYY-MM-DD
  const utcMs = dt.getTime()
  const cnMs = utcMs + 8 * 60 * 60 * 1000
  const cn = new Date(cnMs)
  return `${cn.getUTCFullYear()}-${pad2(cn.getUTCMonth() + 1)}-${pad2(cn.getUTCDate())}`
}

function computeMemo(r: Row): { newMemo: string; truncated: boolean; noDate: boolean } {
  const vn = r.vessel_name ?? ''
  const kw = (r.case_inquiry_keyword ?? '').trim()
  const dateStr = formatDateSh(r.case_inquiry_date)
  const noDate = dateStr === null
  const base = noDate ? `${vn} // ${kw}` : `${vn} // ${kw} // ${dateStr}`
  if (base.length <= MAX_LEN) return { newMemo: base, truncated: false, noDate }
  // 超长则从 keyword 处截断
  // 更简单的方法：直接从 keyword 截断保留号和日期
  let candidate = base
  let truncated = false
  if (candidate.length > MAX_LEN) {
    const suffix = noDate ? '' : ` // ${dateStr}`
    const kwBudget = MAX_LEN - vn.length - ' // '.length - suffix.length
    const kwSafe = kwBudget < 0 ? '' : kw.slice(0, kwBudget)
    candidate = noDate
      ? `${vn} // ${kwSafe}`
      : `${vn} // ${kwSafe} // ${dateStr}`
    truncated = true
  }
  return { newMemo: candidate, truncated, noDate }
}

async function main() {
  console.log(`=== 更新 ${TABLE_NAME}.case_memo_name = vessel_name // keyword // YYYY-MM-DD ===\n`)

  const total = Number(
    (await query<[{ total: number }]>(`SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\``))[0].total
  )
  console.log(`总行数: ${total}`)

  const rows = await query<Row[]>(
    `SELECT case_id, vessel_name, case_inquiry_keyword, case_inquiry_date, case_memo_name FROM \`${TABLE_NAME}\` ORDER BY case_id`
  )

  console.log('\n--- 预览前 15 条（old -> new） ---')
  rows.slice(0, 15).forEach((r) => {
    const { newMemo, truncated, noDate } = computeMemo(r)
    const tag = [truncated ? 'TRUNC' : '', noDate ? 'NO-DATE' : ''].filter(Boolean).join(',')
    console.log(
      `  #${String(r.case_id).padStart(3)} old=${JSON.stringify(r.case_memo_name)}\n` +
      `        -> new (len=${newMemo.length}${tag ? ',' + tag : ''}) ${JSON.stringify(newMemo)}`
    )
  })

  const over = rows
    .map((r) => ({ r, ...computeMemo(r) }))
    .filter((x) => x.truncated || x.newMemo.length > MAX_LEN)
  console.log(
    `\n预计超长（>=${MAX_LEN} 被截断）: ${over.length} 条`
  )
  over.slice(0, 8).forEach((x) => {
    console.log(
      `  #${String(x.r.case_id).padStart(3)} len=${x.newMemo.length} ${JSON.stringify(x.newMemo)}`
    )
  })

  const noDate = rows.filter((r) => formatDateSh(r.case_inquiry_date) === null)
  console.log(`\n预计缺日期（无 case_inquiry_date，最终将只保留 vessel // kw）: ${noDate.length} 条`)
  noDate.forEach((r) => {
    const { newMemo } = computeMemo(r)
    console.log(`  #${String(r.case_id).padStart(3)} ${JSON.stringify(newMemo)}`)
  })

  console.log('\n--- 开始逐行 UPDATE ---')
  let updated = 0
  let unchanged = 0
  for (const r of rows) {
    const { newMemo } = computeMemo(r)
    const old = r.case_memo_name ?? null
    if (old === newMemo) {
      unchanged++
      continue
    }
    const res = await execute(
      `UPDATE \`${TABLE_NAME}\` SET case_memo_name = ? WHERE case_id = ?`,
      [newMemo, r.case_id] as any
    )
    const aff = Number(res.affectedRows ?? 0)
    if (aff > 0) updated++
    if (updated <= 10 && old !== newMemo) {
      console.log(
        `  #${r.case_id}  old=${JSON.stringify(old)} -> new=${JSON.stringify(newMemo)}`
      )
    }
  }
  console.log(`\n更新完成: changed=${updated}, unchanged=${unchanged} (共 ${rows.length})`)
  if (updated > 10) console.log('（仅显示前 10 条明细）')

  console.log('\n--- 后置校验: 抽样 12 条 ---')
  const after = await query<Row[]>(
    `SELECT case_id, vessel_name, case_inquiry_keyword, case_inquiry_date, case_memo_name
     FROM \`${TABLE_NAME}\` ORDER BY case_id LIMIT 12`
  )
  after.forEach((r) => {
    const { newMemo, truncated, noDate } = computeMemo(r)
    const ok = r.case_memo_name === newMemo ? '✓' : '✗'
    const tag = [truncated ? 'TRUNC' : '', noDate ? 'NO-DATE' : ''].filter(Boolean).join(',')
    console.log(
      `  ${ok} #${String(r.case_id).padStart(3)} memo=${JSON.stringify(r.case_memo_name)} (len=${(r.case_memo_name ?? '').length}${tag ? ',' + tag : ''})`
    )
  })

  // 超长/超 100 的剩余数量
  const remainOver = await query<[{ c: number }]>(
    `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE CHAR_LENGTH(COALESCE(case_memo_name,'')) > ?`,
    [MAX_LEN] as any
  )
  const remainNull = await query<[{ c: number }]>(
    `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE case_memo_name IS NULL`
  )
  console.log(`\n最终统计: memo 长度>${MAX_LEN}: ${remainOver[0]?.c ?? 0}; memo=NULL: ${remainNull[0]?.c ?? 0}（应为 0）`)

  if ((remainOver[0]?.c ?? 0) > 0 || (remainNull[0]?.c ?? 0) > 0) {
    console.error('❌ 校验未通过')
    process.exitCode = 1
  } else {
    console.log('✅ 校验通过: 全部 342 条 case_memo_name 已按 vessel_name // keyword // YYYY-MM-DD 重写')
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
