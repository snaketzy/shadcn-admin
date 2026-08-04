import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Dictionary } from '../data/schema'

type DictionariesDialogType = 'invite' | 'add' | 'edit' | 'delete'

type DictionariesContextType = {
  open: DictionariesDialogType | null
  setOpen: (str: DictionariesDialogType | null) => void
  currentRow: Dictionary | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Dictionary | null>>
}

const DictionariesContext = React.createContext<DictionariesContextType | null>(null)

export function DictionariesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<DictionariesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Dictionary | null>(null)

  return (
    <DictionariesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </DictionariesContext>
  )
}

export const useDictionaries = () => {
  const dictionariesContext = React.useContext(DictionariesContext)

  if (!dictionariesContext) {
    throw new Error('useDictionaries has to be used within <DictionariesContext>')
  }

  return dictionariesContext
}
