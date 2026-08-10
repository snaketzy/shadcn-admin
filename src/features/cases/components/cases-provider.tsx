import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Case } from '../data/schema'

type CasesDialogType = 'add' | 'edit' | 'delete'

type CasesContextType = {
  open: CasesDialogType | null
  setOpen: (str: CasesDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

const CasesContext = React.createContext<CasesContextType | null>(null)

export function CasesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CasesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Case | null>(null)

  return (
    <CasesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CasesContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCases = () => {
  const casesContext = React.useContext(CasesContext)

  if (!casesContext) {
    throw new Error('useCases has to be used within <CasesContext>')
  }

  return casesContext
}
