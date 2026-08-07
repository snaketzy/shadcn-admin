/* eslint-disable no-console */
import { closePool, describeTable, execute, query } from './db'

const TABLE_NAME = 'owner_list'
const OLD_COL = 'onwer_email'
const NEW_COL = 'owner_email'

async function main() {
  const info = await describeTable(TABLE_NAME)
  const cols = new Set(info.columns.map((c) => c.field))
  console.log(`当前表 ${TABLE_NAME} 字段: ${info.columns.map((c) => c.field).join(', ')}`)

  if (cols.has(NEW_COL) && !cols.has(OLD_COL)) {
    console.log(`\nℹ️  列 ${NEW_COL} 已存在，且旧列 ${OLD_COL} 已不存在，无需改名`)
  } else if (cols.has(OLD_COL) && cols.has(NEW_COL)) {
    console.error(
      `\n❌ 新旧列同时存在，需人工处理；若 ${NEW_COL} 是误建，可先 DROP COLUMN ${NEW_COL} 再重跑`
    )
    process.exitCode = 1
    return
  } else if (cols.has(OLD_COL)) {
    console.log(`\n执行: ALTER TABLE ... CHANGE COLUMN ${OLD_COL} ${NEW_COL} VARCHAR(255) NULL`)
    const r = await execute(
      `ALTER TABLE \`${TABLE_NAME}\` CHANGE COLUMN \`${OLD_COL}\` \`${NEW_COL}\` VARCHAR(255) NULL COMMENT '负责人邮箱'`
    )
    console.log(`✅ 改名完成, affectedRows=${r.affectedRows ?? 0}, info=${r.info ?? ''}`)
  } else {
    console.error(`\n❌ 既没有 ${OLD_COL} 也没有 ${NEW_COL}，请检查表`)
    process.exitCode = 1
    return
  }

  const cnt = (
    await query<[{ c: number }]>(
      `SELECT COUNT(*) AS c FROM \`${TABLE_NAME}\` WHERE \`${NEW_COL}\` IS NOT NULL AND TRIM(\`${NEW_COL}\`) <> ''`
    )
  )[0].c
  console.log(`\n校验: ${NEW_COL} 非空值有 ${cnt} 条`)

  const after = await describeTable(TABLE_NAME)
  console.log(`最终字段列表: ${after.columns.map((c) => c.field).join(', ')}`)
}

main()
  .catch((err) => {
    console.error('❌ 出错:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
