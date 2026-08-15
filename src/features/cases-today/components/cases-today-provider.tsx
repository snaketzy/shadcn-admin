import type React from 'react'

export { useCasesToday } from '@/store/slices/cases/cases-today-slice'
export type { CasesTodayDialogType } from '@/store/slices/cases/cases-today-slice'

export function CasesTodayProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
