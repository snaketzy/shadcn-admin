import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCasesDealOpen,
  setCasesDealCurrentRow,
  type CasesDealDialogType,
} from '@/store/slices/cases-deal-slice'
import { type Case } from '@/features/cases/data/schema'

type CasesDealContextType = {
  open: CasesDealDialogType | null
  setOpen: (str: CasesDealDialogType | null) => void
  currentRow: Case | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>>
}

export function CasesDealProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCasesDeal = (): CasesDealContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.casesDeal.open)
  const currentRow = useAppSelector((s) => s.casesDeal.currentRow)

  const setOpen = (str: CasesDealDialogType | null) => {
    dispatch(setCasesDealOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Case | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setCasesDealCurrentRow(v(currentRow)))
    } else {
      dispatch(setCasesDealCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
