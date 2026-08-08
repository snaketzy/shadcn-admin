import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Collaboration } from '../data/schema'

type CollaborationsDialogType = 'add' | 'edit' | 'delete'

type CollaborationsContextType = {
  open: CollaborationsDialogType | null
  setOpen: (str: CollaborationsDialogType | null) => void
  currentRow: Collaboration | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Collaboration | null>>
}

const CollaborationsContext = React.createContext<CollaborationsContextType | null>(null)

export function CollaborationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CollaborationsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Collaboration | null>(null)

  return (
    <CollaborationsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CollaborationsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCollaborations = () => {
  const collaborationsContext = React.useContext(CollaborationsContext)

  if (!collaborationsContext) {
    throw new Error('useCollaborations has to be used within <CollaborationsContext>')
  }

  return collaborationsContext
}
