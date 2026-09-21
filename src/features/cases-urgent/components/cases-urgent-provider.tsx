import type React from 'react'

export { useCasesUrgent } from '@/store/slices/cases/cases-urgent-slice'
export type { CasesUrgentDialogType } from '@/store/slices/cases/cases-urgent-slice'

export function CasesUrgentProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
