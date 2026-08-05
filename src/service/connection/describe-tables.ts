/* eslint-disable no-console */
import { closePool, describeTable, listTables } from './db'

function printSeparator(title: string) {
  console.log(`\n${'─'.repeat(3)} ${title} ${'─'.repeat(Math.max(3, 60 - title.length - 5))}`)
}

async function main() {
  const database = process.env.DB_NAME ?? '(未指定)'
  console.log(`=== 查询 ${database} 库的表结构 ===`)

  const tables = await listTables()
  printSeparator(`当前库共有 ${tables.length} 张表`)
  if (tables.length === 0) {
    console.log('（空）')
  } else {
    tables.forEach((t, i) => {
      console.log(`${String(i + 1).padStart(2, ' ')}. ${t}`)
    })
  }

  for (const tableName of tables) {
    const info = await describeTable(tableName)
    printSeparator(
      `表 \`${info.database}\`.\`${tableName}\` — ${info.columnCount} 个字段`
    )
    if (info.primaryKeys.length > 0) {
      console.log(`主键: ${info.primaryKeys.join(', ')}`)
    }
    console.log(
      `\n${'字段'.padEnd(22)}${'类型'.padEnd(24)}${'空'.padEnd(5)}${'键'.padEnd(6)}${'默认值'.padEnd(14)}额外`
    )
    console.log(`${'─'.repeat(22)}${'─'.repeat(24)}${'─'.repeat(5)}${'─'.repeat(6)}${'─'.repeat(14)}${'─'.repeat(20)}`)
    for (const col of info.columns) {
      const def =
        col.default === null
          ? 'NULL'
          : col.default === undefined
            ? ''
            : String(col.default)
      console.log(
        `${col.field.padEnd(22)}${col.type.padEnd(24)}${(col.null ? 'YES' : 'NO').padEnd(5)}${col.key.padEnd(6)}${def.padEnd(14)}${col.extra}`
      )
    }
  }

  if (tables.includes('users')) {
    const users = await describeTable('users')
    printSeparator('只看字段数（回答你的问题）')
    console.log(`users 表一共有 ${users.columnCount} 个字段`)
    console.log('字段名列表:')
    users.columns.forEach((c, i) => {
      console.log(
        `  ${String(i + 1).padStart(2, ' ')}. ${c.field}  (${c.type}${c.null ? ', nullable' : ''}${c.key === 'PRI' ? ', 主键' : ''})`
      )
    })
  }
}

main()
  .catch((err) => {
    console.error('❌ 执行出错:')
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
