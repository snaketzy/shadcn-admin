import type React from 'react'

export { useDictionaries } from '@/store/slices/dictionaries-slice'
export type { DictionariesDialogType } from '@/store/slices/dictionaries-slice'

export function DictionariesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
