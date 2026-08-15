import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setSuppliersOpen,
  setSuppliersCurrentRow,
  type SuppliersDialogType,
} from '@/store/slices/suppliers-slice'
import { type Supplier } from '../data/schema'

type SuppliersContextType = {
  open: SuppliersDialogType | null
  setOpen: (str: SuppliersDialogType | null) => void
  currentRow: Supplier | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Supplier | null>>
}

export function SuppliersProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSuppliers = (): SuppliersContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.suppliers.open)
  const currentRow = useAppSelector((s) => s.suppliers.currentRow)

  const setOpen = (str: SuppliersDialogType | null) => {
    dispatch(setSuppliersOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Supplier | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setSuppliersCurrentRow(v(currentRow)))
    } else {
      dispatch(setSuppliersCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
