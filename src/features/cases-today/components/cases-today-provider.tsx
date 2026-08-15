import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCasesTodayOpen,
  setCasesTodayCurrentRow,
  type CasesTodayDialogType,
} from '@/store/slices/cases-today-slice'
import { type Case } from '@/features/cases/data/schema'

type CasesTodayContextType = {
  open: CasesTodayDialogType | null
  setOpen: (str: CasesTodayDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

export function CasesTodayProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCasesToday = (): CasesTodayContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.casesToday.open)
  const currentRow = useAppSelector((s) => s.casesToday.currentRow)

  const setOpen = (str: CasesTodayDialogType | null) => {
    dispatch(setCasesTodayOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setCasesTodayCurrentRow(v(currentRow)))
    } else {
      dispatch(setCasesTodayCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
