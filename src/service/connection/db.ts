/// <reference types="node" />
import 'dotenv/config'
import mysql, {
  type ExecuteValues,
  type FieldPacket,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise'

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
}

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

export async function closePool(): Promise<void> {
  await pool.end()
}
