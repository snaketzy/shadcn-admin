import type React from 'react'

export { useCasesService } from '@/store/slices/cases/cases-service-slice'
export type { CasesServiceDialogType } from '@/store/slices/cases/cases-service-slice'

export function CasesServiceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
