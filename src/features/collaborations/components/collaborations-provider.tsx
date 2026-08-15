import type React from 'react'

export { useCollaborations } from '@/store/slices/collaborations-slice'
export type { CollaborationsDialogType } from '@/store/slices/collaborations-slice'

export function CollaborationsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
