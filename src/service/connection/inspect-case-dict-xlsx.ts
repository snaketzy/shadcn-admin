/* eslint-disable no-console */
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'

const xlsxPath = path.resolve(
  process.cwd(),
  'assets/database_structure/case_dict.xlsx'
)

if (!fs.existsSync(xlsxPath)) {
  console.error('❌ Excel 文件不存在:', xlsxPath)
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
  const sampleType =
    firstNonEmpty === null || firstNonEmpty === undefined
      ? '(全空)'
      : typeof firstNonEmpty === 'object'
        ? firstNonEmpty instanceof Date
          ? `Date (示例: ${firstNonEmpty.toISOString()})`
          : `${Object.prototype.toString.call(firstNonEmpty)}`
        : `${typeof firstNonEmpty} (示例: ${JSON.stringify(firstNonEmpty)})`
  console.log(`  ${String(i + 1).padStart(2)}. ${h}  =>  推断类型: ${sampleType}`)
})

console.log('\n=== 前 3 行样例数据 ===')
rows.slice(0, 3).forEach((row, i) => {
  console.log(`\n第 ${i + 1} 行:`)
  for (const k of headers) {
    console.log(`  ${k}: ${JSON.stringify(row[k])}`)
  }
})
