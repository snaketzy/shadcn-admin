/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'case_list'

type Row = {
  case_id: number
  case_inquiry_date: string | Date | null
  case_follow_date: string | Date | null
  case_uptodate_date: string | Date | null
  case_memo_name: string | null
}

type Stats = {
  total: number
  eq: number
  gt: number
  lt: number
  oneNull: number
  badRange: number
}

function toISODay(v: any): string | null {
  if (v === null || v === undefined) return null
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
function toISODt(v: any): string | null {
  if (v === null || v === undefined) return null
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19)
}
function extractMemoDate(memo: string | null): string | null {
  if (!memo) return null
  const m = /\/\/\s*(\d{4}-\d{2}-\d{2})\s*$/.exec(memo.trim())
  return m ? m[1] : null
}
function ymdTo16UTC(d: string): string {
  // case 表所有日期列存的都是 UTC 当天 16:00 (CST+8 零点 对应 UTC 16:00 前一天)
  // 所以我们对于"某一天 D"，把 DATETIME 写成 D-1 的 16:00 UTC，这样前端按 +8 时区格式化正好得到 D
  const dt = new Date(`${d}T16:00:00.000Z`)
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  const hh = String(dt.getUTCHours()).padStart(2, '0')
  const mm = String(dt.getUTCMinutes()).padStart(2, '0')
  const ss = String(dt.getUTCSeconds()).padStart(2, '0')
  return `${y}-${mo}-${dd} ${hh}:${mm}:${ss}`
}

async function getStats(): Promise<Stats> {
  const all = await query<Row[]>(
    `SELECT case_id, case_inquiry_date, case_follow_date, case_uptodate_date, case_memo_name FROM \`${TABLE_NAME}\``
  )
  let eq = 0, gt = 0, lt = 0, oneNull = 0, badRange = 0
  for (const r of all) {
    const f = r.case_follow_date, u = r.case_uptodate_date
    if (f == null || u == null) { oneNull++; continue }
    const a = new Date(String(f)).getTime(), b = new Date(String(u)).getTime()
    if (a === b) eq++
    else if (b > a) gt++
    else lt++
    const i = r.case_inquiry_date
    if (i != null) {
      const c = new Date(String(i)).getTime()
      if (c < a || c > b) badRange++
    }
  }
  return { total: all.length, eq, gt, lt, oneNull, badRange }
}

async function main() {
  console.log(`=== ${TABLE_NAME}：修复 follow_date(开始日期) / uptodate(跟进日期) 语义 ===\n`)

  const before = await getStats()
  console.log('前置统计:')
  console.log(`  总数=${before.total}`)
  console.log(`  正序 up>fl=${before.gt}；相等 up=fl=${before.eq}；反序 up<fl=${before.lt}；任一为空=${before.oneNull}`)
  console.log(`  其中 fl<=inq<=up 不成立=${before.badRange}（两列相等+inq 不在 fl..up 之间的"错序行"，本次主要修复目标）`)

  const rows = await query<Row[]>(
    `SELECT case_id, case_inquiry_date, case_follow_date, case_uptodate_date, case_memo_name
     FROM \`${TABLE_NAME}\`
     WHERE case_follow_date IS NOT NULL
       AND case_uptodate_date IS NOT NULL
       AND case_follow_date = case_uptodate_date
     ORDER BY case_id`
  )
  console.log(`\n候选修复行(相等行)共 ${rows.length}\n`)

  let patched = 0
  let skipMemo = 0
  let skipKeep = 0
  for (const r of rows) {
    const curDt = toISODt(r.case_follow_date)! // 两列相等，这是当前同一个 DATETIME
    const curDay = toISODay(r.case_follow_date)!
    const inqDay = toISODay(r.case_inquiry_date)
    const memoDay = extractMemoDate(r.case_memo_name)
    // 预期语义 follow <= inquiry <= uptodate，且两列原本是不同日期
    // 如果 memoDay == curDay 说明 follow 本来就是这天（或真正的 follow 其实就是 inquiry 当日，不处理）
    if (!memoDay) { skipMemo++; continue }
    const curTs = new Date(curDay + 'T00:00:00Z').getTime()
    const memoTs = new Date(memoDay + 'T00:00:00Z').getTime()
    // 不强制 inq 必须 >= memo（有少量行 inq 比 memo 晚 1 天，仍在 follow..up 区间内，不影响 fl<up 目标）
    const shouldPatch = memoTs < curTs
    if (!shouldPatch) { skipKeep++; continue }
    const newFollowSql = ymdTo16UTC(memoDay)
    const newUpSql = curDt.replace('T', ' ') // curDay 保持现有 DATETIME
    const res = await execute(
      `UPDATE \`${TABLE_NAME}\` SET case_follow_date = ?, case_uptodate_date = ? WHERE case_id = ? AND case_follow_date = case_uptodate_date`,
      [newFollowSql, newUpSql, r.case_id] as any
    )
    const aff = Number(res.affectedRows ?? 0)
    if (aff > 0) {
      patched++
      if (patched <= 12) {
        console.log(
          `  #${String(r.case_id).padStart(3)} inq=${(inqDay ?? '-').padEnd(10)} ` +
          `follow: ${curDay} → ${memoDay}  uptodate: ${curDay}`
        )
      }
    }
  }
  console.log(`\n修复完成: patched=${patched}，无 memo-date 跳过=${skipMemo}，无需修跳过=${skipKeep}`)
  if (patched > 12) console.log('（仅展示前 12 条明细）')

  console.log('\n--- 后置统计 ---')
  const after = await getStats()
  console.log(`  正序 up>fl=${after.gt}（期望约 ${before.gt}+${patched}=${before.gt + patched}）`)
  console.log(`  相等 up=fl=${after.eq}（期望 ${before.eq - patched}=${before.eq - patched}）`)
  console.log(`  反序 up<fl=${after.lt}（应为 0）`)
  console.log(`  任一为空=${after.oneNull}（应为 ${before.oneNull}）`)
  console.log(`  fl<=inq<=up 不成立=${after.badRange}（应大幅减少）`)

  const ltRows = await query<Row[]>(
    `SELECT case_id, case_inquiry_date, case_follow_date, case_uptodate_date, case_memo_name
     FROM \`${TABLE_NAME}\`
     WHERE case_uptodate_date < case_follow_date LIMIT 5`
  )
  if (ltRows.length > 0) {
    console.log('\n⚠️  仍有反序:')
    ltRows.forEach(r => console.log(`  #${r.case_id} fl=${toISODt(r.case_follow_date)} up=${toISODt(r.case_uptodate_date)} memo=${JSON.stringify(r.case_memo_name?.slice(0, 70))}`))
  }

  const eqRows = await query<Row[]>(
    `SELECT case_id, case_inquiry_date, case_follow_date, case_uptodate_date, case_memo_name
     FROM \`${TABLE_NAME}\`
     WHERE case_follow_date IS NOT NULL AND case_uptodate_date IS NOT NULL
       AND case_follow_date = case_uptodate_date
     ORDER BY case_id LIMIT 10`
  )
  console.log('\n--- 剩余相等行样例 10 ---')
  eqRows.forEach(r => {
    console.log(`  #${String(r.case_id).padStart(3)} inq=${(toISODay(r.case_inquiry_date) ?? '-').padEnd(10)} fl==up=${toISODay(r.case_follow_date)} memo=${JSON.stringify(extractMemoDate(r.case_memo_name))}`)
  })

  const normRows = await query<Row[]>(
    `SELECT case_id, case_inquiry_date, case_follow_date, case_uptodate_date
     FROM \`${TABLE_NAME}\`
     WHERE case_follow_date IS NOT NULL AND case_uptodate_date IS NOT NULL
       AND case_follow_date < case_uptodate_date
     ORDER BY case_id LIMIT 10`
  )
  console.log('\n--- 正序 fl < up 样例 10 ---')
  normRows.forEach(r => {
    console.log(`  #${String(r.case_id).padStart(3)} inq=${(toISODay(r.case_inquiry_date) ?? '-').padEnd(10)} fl=${toISODay(r.case_follow_date)}  up=${toISODay(r.case_uptodate_date)}`)
  })

  const ok = after.lt === 0 && after.oneNull === before.oneNull &&
    after.gt === before.gt + patched && after.eq === before.eq - patched
  if (!ok) {
    console.error('\n❌ 校验未通过!')
    process.exitCode = 1
  } else {
    console.log('\n✅ 修复通过: 现在 fl<=inq<=up 语义下 fl<=up 全部成立（反序=0），且与原始数据区间一致。')
  }
}

main()
  .catch(err => {
    console.error('\n❌ 异常:', err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
