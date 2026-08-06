/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'

const fileName = process.argv[2] ?? 'agent_list.xlsx'
const xlsxPath = path.resolve(
  process.cwd(),
  'assets/database_structure',
  fileName
)

if (!fs.existsSync(xlsxPath)) {
  console.error('❌ Excel 文件不存在:', xlsxPath)
  console.error('用法: npx tsx src/service/connection/inspect-xlsx.ts <文件名.xlsx>')
  process.exit(1)
}

const buffer = fs.readFileSync(xlsxPath)
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
const sheetName = workbook.SheetNames[0]
console.log('工作表列表:', workbook.SheetNames)
console.log('当前读取工作表:', sheetName)

const sheet = workbook.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
  defval: null,
  raw: true,
})

console.log(`\n总行数: ${rows.length}`)
if (rows.length === 0) {
  console.log('⚠️  Excel 中没有数据行')
  process.exit(0)
}

const headers = Object.keys(rows[0])
console.log(`\n表头列数: ${headers.length}`)
console.log('表头列名:')
headers.forEach((h, i) => {
  const firstNonEmpty = rows
    .map((r) => r[h])
    .find((v) => v !== null && v !== undefined && v !== '')
  const describe = (v: unknown): string => {
    if (v === null || v === undefined) return '(全空)'
    if (v instanceof Date) return `Date (示例: ${v.toISOString()})`
    if (typeof v === 'number') return `number (示例: ${v})`
    if (typeof v === 'string') return `string (示例: ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v)})`
    if (typeof v === 'boolean') return `boolean (示例: ${v})`
    if (typeof v === 'object') return `object (${JSON.stringify(v).slice(0, 40)})`
    return `${typeof v} (${String(v).slice(0, 40)})`
  }
  console.log(`  ${String(i + 1).padStart(2)}. ${h}  =>  ${describe(firstNonEmpty)}`)
})

const sampleCount = Math.min(3, rows.length)
console.log(`\n=== 前 ${sampleCount} 行样例数据 ===`)
rows.slice(0, sampleCount).forEach((row, i) => {
  console.log(`\n第 ${i + 1} 行:`)
  for (const k of headers) {
    console.log(`  ${k}: ${JSON.stringify(row[k])}`)
  }
})
