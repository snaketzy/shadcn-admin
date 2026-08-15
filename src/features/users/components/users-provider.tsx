import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setUsersOpen,
  setUsersCurrentRow,
  type UsersDialogType,
} from '@/store/slices/users-slice'
import { type Vessel } from '../data/schema'

type UsersContextType = {
  open: UsersDialogType | null
  setOpen: (str: UsersDialogType | null) => void
  currentRow: Vessel | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Vessel | null>>
}

export function UsersProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUsers = (): UsersContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.users.open)
  const currentRow = useAppSelector((s) => s.users.currentRow)

  const setOpen = (str: UsersDialogType | null) => {
    dispatch(setUsersOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Vessel | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setUsersCurrentRow(v(currentRow)))
    } else {
      dispatch(setUsersCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
