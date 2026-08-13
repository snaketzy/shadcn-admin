import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Case } from '@/features/cases/data/schema'

type CasesDealDialogType = 'add' | 'edit' | 'delete'

type CasesDealContextType = {
  open: CasesDealDialogType | null
  setOpen: (str: CasesDealDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

const CasesDealContext = React.createContext<CasesDealContextType | null>(null)

export function CasesDealProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CasesDealDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Case | null>(null)

  return (
    <CasesDealContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CasesDealContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCasesDeal = () => {
  const ctx = React.useContext(CasesDealContext)

  if (!ctx) {
    throw new Error('useCasesDeal has to be used within <CasesDealContext>')
  }

  return ctx
}
