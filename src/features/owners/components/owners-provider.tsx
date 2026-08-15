import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setOwnersOpen,
  setOwnersCurrentRow,
  type OwnersDialogType,
} from '@/store/slices/owners-slice'
import { type Owner } from '../data/schema'

type OwnersContextType = {
  open: OwnersDialogType | null
  setOpen: (str: OwnersDialogType | null) => void
  currentRow: Owner | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Owner | null>>
}

export function OwnersProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOwners = (): OwnersContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.owners.open)
  const currentRow = useAppSelector((s) => s.owners.currentRow)

  const setOpen = (str: OwnersDialogType | null) => {
    dispatch(setOwnersOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Owner | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setOwnersCurrentRow(v(currentRow)))
    } else {
      dispatch(setOwnersCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
