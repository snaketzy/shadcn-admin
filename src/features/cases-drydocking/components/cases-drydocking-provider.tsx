import type React from 'react'

export { useCases } from '@/store/slices/cases/cases-slice'
export type { CasesDialogType } from '@/store/slices/cases/cases-slice'

export function CasesDrydockingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
