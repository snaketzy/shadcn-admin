import { query } from './db'

export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended'
export type UserRole = 'superadmin' | 'admin' | 'cashier' | 'manager'

export interface UserRow {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  status: UserStatus
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export async function getAllUsers(): Promise<UserRow[]> {
  const rows = await query<UserRow[]>(
    'SELECT id, firstName, lastName, username, email, phoneNumber, status, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC'
  )
  return rows
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, firstName, lastName, username, email, phoneNumber, status, role, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0] ?? null
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, firstName, lastName, username, email, phoneNumber, status, role, createdAt, updatedAt FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  return rows[0] ?? null
}

export async function getUsersByStatus(
  status: UserStatus
): Promise<UserRow[]> {
  const rows = await query<UserRow[]>(
    'SELECT id, firstName, lastName, username, email, phoneNumber, status, role, createdAt, updatedAt FROM users WHERE status = ? ORDER BY createdAt DESC',
    [status]
  )
  return rows
}

export async function getUsersPaginated(
  page: number = 1,
  pageSize: number = 50
): Promise<{ users: UserRow[]; total: number; page: number; pageSize: number }> {
  const offset = (page - 1) * pageSize
  const [countRows, users] = await Promise.all([
    query<[{ total: number }]>('SELECT COUNT(*) as total FROM users'),
    query<UserRow[]>(
      'SELECT id, firstName, lastName, username, email, phoneNumber, status, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    ),
  ])
  return {
    users,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  }
}
