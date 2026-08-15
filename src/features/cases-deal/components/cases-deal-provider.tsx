import type React from 'react'

export { useCasesDeal } from '@/store/slices/cases/cases-deal-slice'
export type { CasesDealDialogType } from '@/store/slices/cases/cases-deal-slice'

export function CasesDealProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
