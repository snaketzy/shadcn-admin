import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Owner } from '../data/schema'

type OwnersDialogType = 'add' | 'edit' | 'delete'

type OwnersContextType = {
  open: OwnersDialogType | null
  setOpen: (str: OwnersDialogType | null) => void
  currentRow: Owner | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Owner | null>>
}

const OwnersContext = React.createContext<OwnersContextType | null>(null)

export function OwnersProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<OwnersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Owner | null>(null)

  return (
    <OwnersContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </OwnersContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOwners = () => {
  const ownersContext = React.useContext(OwnersContext)

  if (!ownersContext) {
    throw new Error('useOwners has to be used within <OwnersContext>')
  }

  return ownersContext
}
