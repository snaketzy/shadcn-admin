import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setDictionariesOpen,
  setDictionariesCurrentRow,
  type DictionariesDialogType,
} from '@/store/slices/dictionaries-slice'
import { type CaseDictType } from '../data/schema'

type DictionariesContextType = {
  open: DictionariesDialogType | null
  setOpen: (str: DictionariesDialogType | null) => void
  currentRow: CaseDictType | null
  setCurrentRow: React.Dispatch<React.SetStateAction<CaseDictType | null>>
}

export function DictionariesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export const useDictionaries = (): DictionariesContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.dictionaries.open)
  const currentRow = useAppSelector((s) => s.dictionaries.currentRow)

  const setOpen = (str: DictionariesDialogType | null) => {
    dispatch(setDictionariesOpen(str))
  }
  const setCurrentRow: React.Dispatch<
    React.SetStateAction<CaseDictType | null>
  > = (v) => {
    if (typeof v === 'function') {
      dispatch(setDictionariesCurrentRow(v(currentRow)))
    } else {
      dispatch(setDictionariesCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
