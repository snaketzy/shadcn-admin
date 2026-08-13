import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Case } from '@/features/cases/data/schema'

type CasesTodayDialogType = 'add' | 'edit' | 'delete'

type CasesTodayContextType = {
  open: CasesTodayDialogType | null
  setOpen: (str: CasesTodayDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

const CasesTodayContext = React.createContext<CasesTodayContextType | null>(null)

export function CasesTodayProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CasesTodayDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Case | null>(null)

  return (
    <CasesTodayContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CasesTodayContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCasesToday = () => {
  const ctx = React.useContext(CasesTodayContext)

  if (!ctx) {
    throw new Error('useCasesToday has to be used within <CasesTodayContext>')
  }

  return ctx
}
