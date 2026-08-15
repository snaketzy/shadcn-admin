import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCasesOpen,
  setCasesCurrentRow,
  type CasesDialogType,
} from '@/store/slices/cases-slice'
import { type Case } from '../data/schema'

type CasesContextType = {
  open: CasesDialogType | null
  setOpen: (str: CasesDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

export function CasesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCases = (): CasesContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.cases.open)
  const currentRow = useAppSelector((s) => s.cases.currentRow)

  const setOpen = (str: CasesDialogType | null) => {
    dispatch(setCasesOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setCasesCurrentRow(v(currentRow)))
    } else {
      dispatch(setCasesCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
