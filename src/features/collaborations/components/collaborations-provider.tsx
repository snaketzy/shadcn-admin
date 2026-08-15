import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCollaborationsOpen,
  setCollaborationsCurrentRow,
  type CollaborationsDialogType,
} from '@/store/slices/collaborations-slice'
import { type Collaboration } from '../data/schema'

type CollaborationsContextType = {
  open: CollaborationsDialogType | null
  setOpen: (str: CollaborationsDialogType | null) => void
  currentRow: Collaboration | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Collaboration | null>>
}

export function CollaborationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCollaborations = (): CollaborationsContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.collaborations.open)
  const currentRow = useAppSelector((s) => s.collaborations.currentRow)

  const setOpen = (str: CollaborationsDialogType | null) => {
    dispatch(setCollaborationsOpen(str))
  }
  const setCurrentRow: React.Dispatch<
    React.SetStateAction<Collaboration | null>
  > = (v) => {
    if (typeof v === 'function') {
      dispatch(setCollaborationsCurrentRow(v(currentRow)))
    } else {
      dispatch(setCollaborationsCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
