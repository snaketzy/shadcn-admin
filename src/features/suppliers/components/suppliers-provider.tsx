import type React from 'react'

export { useSuppliers } from '@/store/slices/suppliers-slice'
export type { SuppliersDialogType } from '@/store/slices/suppliers-slice'

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
