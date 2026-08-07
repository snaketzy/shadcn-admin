/// <reference types="node" />
import 'dotenv/config'
import mysql, {
  type ExecuteValues,
  type FieldPacket,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise'

export type { ExecuteValues }

type QueryResult = [RowDataPacket[] | ResultSetHeader, FieldPacket[]]

function parseHostAndPort(hostname: string): { host: string; port?: number } {
  const parts = hostname.split(':')
  if (parts.length === 2) {
    return { host: parts[0], port: Number(parts[1]) }
  }
  return { host: hostname }
}

const { host, port: hostPort } = parseHostAndPort(
  process.env.DB_HOSTNAME ?? 'localhost'
)

function resolvePort(): number {
  if (hostPort !== undefined) return hostPort
  const envPort = process.env.DB_PORT
  if (envPort !== undefined && envPort !== '') return Number(envPort)
  return 3306
}

const poolConfig: PoolOptions = {
  host,
  port: resolvePort(),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? '',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 5000,
}

const currentDatabase = process.env.DB_NAME ?? ''
const pool = mysql.createPool(poolConfig)

export async function query<T = RowDataPacket[]>(
  sql: string,
  params?: ExecuteValues
): Promise<T> {
  const [rows] = (await pool.execute(sql, params)) as QueryResult
  return rows as T
}

export async function execute(
  sql: string,
  params?: ExecuteValues
): Promise<ResultSetHeader> {
  const [result] = (await pool.execute(sql, params)) as QueryResult
  return result as ResultSetHeader
}

export function getPool() {
  return pool
}

export interface TableColumn {
  field: string
  type: string
  null: boolean
  key: string
  default: unknown
  extra: string
}

export interface TableInfo {
  database: string
  table: string
  columns: TableColumn[]
  columnCount: number
  primaryKeys: string[]
}

export async function describeTable(tableName: string): Promise<TableInfo> {
  const raw = await query<
    Array<{
      Field: string
      Type: string
      Null: string
      Key: string
      Default: unknown
      Extra: string
    }>
  >(`DESCRIBE \`${tableName}\``)
  const columns: TableColumn[] = raw.map((row) => ({
    field: row.Field,
    type: row.Type,
    null: row.Null === 'YES',
    key: row.Key,
    default: row.Default,
    extra: row.Extra,
  }))
  const primaryKeys = columns.filter((c) => c.key === 'PRI').map((c) => c.field)
  return {
    database: currentDatabase,
    table: tableName,
    columns,
    columnCount: columns.length,
    primaryKeys,
  }
}

export async function listTables(): Promise<string[]> {
  const rows = await query<Record<string, string>[]>('SHOW TABLES')
  const key = Object.keys(rows[0] ?? {})[0] ?? ''
  return rows.map((row) => row[key]).filter(Boolean)
}

export async function closePool(): Promise<void> {
  await pool.end()
}
