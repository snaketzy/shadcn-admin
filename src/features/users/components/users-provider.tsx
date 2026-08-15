import type React from 'react'

export { useUsers } from '@/store/slices/users-slice'
export type { UsersDialogType } from '@/store/slices/users-slice'

export function UsersProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
