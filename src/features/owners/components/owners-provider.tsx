import type React from 'react'

export { useOwners } from '@/store/slices/owners-slice'
export type { OwnersDialogType } from '@/store/slices/owners-slice'

export function OwnersProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
