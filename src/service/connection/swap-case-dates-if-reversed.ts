/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'case_list'

type Stats = {
  total: number
  up_null: number
  fl_null: number
  eq: number
  up_lt_fl: number // 反序: up < fl (语义上:跟进日期<开始日期 => 需要互换)
  up_gt_fl: number // 正序: up > fl
}

type Row = {
  case_id: number
  case_uptodate_date: Date | string | null
  case_follow_date: Date | string | null
}

async function getStats(): Promise<Stats> {
  const r = await query<Stats[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN case_uptodate_date IS NULL THEN 1 ELSE 0 END) AS up_null,
      SUM(CASE WHEN case_follow_date   IS NULL THEN 1 ELSE 0 END) AS fl_null,
      SUM(CASE WHEN case_uptodate_date = case_follow_date THEN 1 ELSE 0 END) AS eq,
      SUM(CASE WHEN case_uptodate_date < case_follow_date THEN 1 ELSE 0 END) AS up_lt_fl,
      SUM(CASE WHEN case_uptodate_date > case_follow_date THEN 1 ELSE 0 END) AS up_gt_fl
    FROM \`${TABLE_NAME}\``
  )
  return r[0]
}

function fmt(v: Date | string | null): string {
  if (v === null || v === undefined) return 'NULL'
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toISOString().slice(0, 19)
}

async function main() {
  console.log(
    `=== ${TABLE_NAME}：case_follow_date (开始日期) 应该 <= case_uptodate_date (跟进日期)\n` +
    `当且仅当 uptodate < follow 时 两列互换 ===\n`
  )

  const before = await getStats()
  console.log('--- 前置统计 ---')
  console.log(`  总数=${before.total}`)
  console.log(`  空：follow_null=${before.fl_null}, uptodate_null=${before.up_null}`)
  console.log(`  正序 up>fl (无需换): ${before.up_gt_fl}`)
  console.log(`  相等 up=fl        : ${before.eq}`)
  console.log(`  反序 up<fl (将互换): ${before.up_lt_fl}`)

  if (before.up_lt_fl === 0) {
    console.log('\nℹ️  没有反序记录，无需互换。清理旧逻辑遗留重复/错误的 UPDATE。退出。')
    return
  }

  console.log('\n--- 互换前样例 (反序前 10 条) ---')
  const revBefore = await query<Row[]>(
    `SELECT case_id, case_uptodate_date, case_follow_date FROM \`${TABLE_NAME}\`
     WHERE case_uptodate_date IS NOT NULL AND case_follow_date IS NOT NULL
       AND case_uptodate_date < case_follow_date
     ORDER BY case_id LIMIT 10`
  )
  revBefore.forEach((r) => {
    console.log(
      `  #${String(r.case_id).padStart(3)}  follow(开始)=${fmt(r.case_follow_date).padEnd(19)}  uptodate(跟进)=${fmt(r.case_uptodate_date).padEnd(19)}  [反序:up<fl]`
    )
  })

  console.log('\n--- 执行互换（按主键逐行 UPDATE，双写防串值）---')
  const rows = await query<Row[]>(
    `SELECT case_id, case_uptodate_date, case_follow_date FROM \`${TABLE_NAME}\`
     WHERE case_uptodate_date IS NOT NULL AND case_follow_date IS NOT NULL
       AND case_uptodate_date < case_follow_date
     ORDER BY case_id`
  )
  let touched = 0
  let skipped = 0
  for (const r of rows) {
    const oldFollow = r.case_follow_date // 值较大（"晚"的日期）
    const oldUp = r.case_uptodate_date   // 值较小（"早"的日期）
    // 互换后: follow = 早, up = 晚
    const newFollowSql = oldUp instanceof Date ? oldUp : new Date(String(oldUp))
    const newUpSql = oldFollow instanceof Date ? oldFollow : new Date(String(oldFollow))
    // 注意：new Date(str) 会把本地时区转UTC存入；DB里 DATETIME 不涉及时区，直接以本地时区格式化"YYYY-MM-DD HH:mm:ss"写入
    // 这里先把读出的 Date 当成数据库里实际显示的同一值，即：无论时区，按 UTC 分量取。
    const toStrUTC = (d: Date) => {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mm = String(d.getUTCMinutes()).padStart(2, '0')
      const ss = String(d.getUTCSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    }
    const nfStr = toStrUTC(newFollowSql)
    const nuStr = toStrUTC(newUpSql)

    const res = await execute(
      `UPDATE \`${TABLE_NAME}\` SET case_follow_date = ?, case_uptodate_date = ? WHERE case_id = ? AND case_uptodate_date < case_follow_date`,
      [nfStr, nuStr, r.case_id] as any
    )
    const aff = Number(res.affectedRows ?? 0)
    if (aff > 0) {
      touched++
      if (touched <= 10) {
        console.log(
          `  #${String(r.case_id).padStart(3)}  follow: ${fmt(r.case_follow_date)} → ${nfStr}`
        )
        console.log(`         up    : ${fmt(r.case_uptodate_date)} → ${nuStr}`)
      }
    } else skipped++
  }
  console.log(`\n逐行 UPDATE 完成: 互换 ${touched} 条, skip ${skipped} 条`)
  if (touched > 10) console.log('（仅展示前 10 条明细）')

  console.log('\n--- 后置校验 ---')
  const after = await getStats()
  console.log(`  正序 up>fl : ${after.up_gt_fl} (期望 ≈ ${before.up_gt_fl} + ${before.up_lt_fl})`)
  console.log(`  相等 up=fl : ${after.eq}`)
  console.log(`  反序 up<fl : ${after.up_lt_fl} (应为 0)`)
  console.log(`  空值       : follow NULL=${after.fl_null} (应 ${before.fl_null}); up NULL=${after.up_null} (应 ${before.up_null})`)

  const revAfter = await query<Row[]>(
    `SELECT case_id, case_uptodate_date, case_follow_date FROM \`${TABLE_NAME}\`
     WHERE case_uptodate_date IS NOT NULL AND case_follow_date IS NOT NULL
       AND case_uptodate_date < case_follow_date
     ORDER BY case_id LIMIT 5`
  )
  if (revAfter.length > 0) {
    console.log('\n⚠️  仍有反序残留:')
    revAfter.forEach(r => console.log(`  #${r.case_id}  up=${fmt(r.case_uptodate_date)} fl=${fmt(r.case_follow_date)}`))
  }

  const normNow = await query<Row[]>(
    `SELECT case_id, case_uptodate_date, case_follow_date FROM \`${TABLE_NAME}\`
     WHERE case_uptodate_date IS NOT NULL AND case_follow_date IS NOT NULL
       AND case_uptodate_date > case_follow_date
     ORDER BY case_id LIMIT 8`
  )
  console.log('\n后置样例 - 正序 up>fl 前 8:')
  normNow.forEach(r => console.log(
    `  #${String(r.case_id).padStart(3)}  follow=${fmt(r.case_follow_date).padEnd(19)}  uptodate=${fmt(r.case_uptodate_date).padEnd(19)}`
  ))

  const ok = after.up_lt_fl === 0 &&
    after.fl_null === before.fl_null &&
    after.up_null === before.up_null
  if (!ok) {
    console.error('\n❌ 校验未通过!')
    process.exitCode = 1
  } else {
    console.log('\n✅ 互换成功: 现在所有 follow(开始日期) <= uptodate(跟进日期)，反序行数量=0，空值计数未发生变化。')
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
