/* eslint-disable no-console */
import { closePool, execute, query } from './db'

const TABLE_NAME = 'case_list'

type DictRow = { dict_key: string; dict_value: string; dict_group: string }
type CaseRow = { case_id: number; case_incharge: string | null }

function splitParts(raw: string): string[] {
  return raw
    .split(/\s*[,，]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function main() {
  console.log(`=== 更新 ${TABLE_NAME}.case_incharge: 姓名 -> E开头编码 ===\n`)

  // 1. 加载字典: 小写(dict_value) -> dict_key
  const dict = await query<DictRow[]>(
    `SELECT dict_key, dict_value, dict_group FROM case_dict WHERE dict_key LIKE 'E%'`
  )
  const map = new Map<string, string>()
  for (const d of dict) {
    const k = (d.dict_value ?? '').trim()
    if (k === '') continue
    const lower = k.toLowerCase()
    if (map.has(lower)) {
      console.log(
        `[冲突] 字典里 ${JSON.stringify(k)} 已映射 ${map.get(lower)}，忽略 ${d.dict_key}`
      )
    } else {
      map.set(lower, d.dict_key)
    }
  }
  console.log(
    `字典(E开头)共 ${dict.length} 条，反向映射 ${map.size} 条: ` +
      [...map.entries()].map(([k, v]) => `${k}->${v}`).join(', ')
  )
  console.log()

  // 2. 读全部 case 记录
  const all = await query<CaseRow[]>(
    `SELECT case_id, case_incharge FROM \`${TABLE_NAME}\` ORDER BY case_id`
  )
  console.log(`总记录数: ${all.length}`)

  // 前置分布
  const beforeDist = new Map<string, number>()
  for (const r of all) {
    const v = r.case_incharge === null ? '(NULL)' : r.case_incharge
    beforeDist.set(v, (beforeDist.get(v) ?? 0) + 1)
  }
  console.log('\n--- 更新前分布 Top ---')
  ;[...beforeDist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([v, c]) => console.log(`  ${v.padEnd(28)} ${c}`))

  // 3. 预览前 15 条
  console.log('\n--- 预览前 15 条 (old -> new) ---')
  all.slice(0, 15).forEach((r) => {
    const raw = (r.case_incharge ?? '').trim()
    if (raw === '') {
      console.log(`  #${String(r.case_id).padStart(3)} ${JSON.stringify(r.case_incharge)} -> (不变)`)
      return
    }
    const parts = splitParts(raw)
    const mapped = parts.map((p) => map.get(p.toLowerCase()) ?? p)
    const joined = mapped.join('，')
    const tag = joined !== raw ? ' [CHANGE]' : ' [KEEP]'
    console.log(
      `  #${String(r.case_id).padStart(3)} ${JSON.stringify(raw)} -> ${JSON.stringify(joined)}${tag}`
    )
  })

  // 4. 逐行 UPDATE（只有变化的才发 SQL）
  console.log('\n--- 逐行 UPDATE ---')
  let changed = 0
  let kept = 0
  const afterDist = new Map<string, number>()
  const notFound = new Map<string, number>()
  for (const r of all) {
    const oldRaw = r.case_incharge
    const oldVal = oldRaw === null ? null : String(oldRaw)
    const raw = (oldVal ?? '').trim()
    let newVal: string | null
    if (raw === '') {
      newVal = oldVal
    } else {
      const parts = splitParts(raw)
      const mapped = parts.map((p) => {
        const m = map.get(p.toLowerCase())
        if (!m) notFound.set(p, (notFound.get(p) ?? 0) + 1)
        return m ?? p
      })
      newVal = mapped.join('，')
    }
    afterDist.set(newVal === null ? '(NULL)' : newVal, (afterDist.get(newVal === null ? '(NULL)' : newVal) ?? 0) + 1)
    if (newVal === oldVal) {
      kept++
      continue
    }
    const res = await execute(
      `UPDATE \`${TABLE_NAME}\` SET case_incharge = ? WHERE case_id = ?`,
      [newVal, Number(r.case_id)] as any
    )
    if (Number(res.affectedRows ?? 0) > 0) {
      changed++
      if (changed <= 15) {
        console.log(
          `  #${String(r.case_id).padStart(3)} ${JSON.stringify(oldVal)} -> ${JSON.stringify(newVal)}`
        )
      }
    }
  }
  console.log(`\n统计: changed=${changed}, kept=${kept} (共 ${all.length})`)
  if (changed > 15) console.log('（仅展示前 15 条变更明细）')

  // 5. 后分布
  console.log('\n--- 更新后分布 ---')
  ;[...afterDist.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([v, c]) => console.log(`  ${v.padEnd(28)} ${c}`))

  // 6. 未命中字典的值
  if (notFound.size > 0) {
    console.log('\n⚠️  未在 case_dict(E开头) 中找到，保持原值的 value:')
    ;[...notFound.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${k.padEnd(16)} 出现在 ${v} 行`))
  } else {
    console.log('\n✅ 所有出现的负责人姓名都能在字典中找到匹配')
  }

  // 7. 抽样确认
  console.log('\n--- 抽样 12 条 DB 实际读取 ---')
  const after = await query<CaseRow[]>(
    `SELECT case_id, case_incharge FROM \`${TABLE_NAME}\` ORDER BY case_id LIMIT 12`
  )
  after.forEach((r) => {
    const raw = (r.case_incharge ?? '').trim()
    let tag = ''
    if (raw !== '') {
      const parts = splitParts(raw)
      const allCode = parts.every((p) => /^E\d+$/.test(p))
      tag = allCode ? ' [FULL-CODE]' : raw === '(NULL)' ? '' : ' [MIXED/UNKNOWN]'
    }
    console.log(
      `  #${String(r.case_id).padStart(3)} ${JSON.stringify(r.case_incharge)}${tag}`
    )
  })
}

main()
  .catch((err) => {
    console.error('\n❌ 异常:', err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
