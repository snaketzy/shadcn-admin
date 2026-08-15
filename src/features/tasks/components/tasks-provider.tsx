import React from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setTasksOpen,
  setTasksCurrentRow,
  type TasksDialogType,
} from '@/store/slices/tasks-slice'
import { type Task } from '../data/schema'

type TasksContextType = {
  open: TasksDialogType | null
  setOpen: (str: TasksDialogType | null) => void
  currentRow: Task | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Task | null>>
}

export function TasksProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTasks = (): TasksContextType => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.tasks.open)
  const currentRow = useAppSelector((s) => s.tasks.currentRow)

  const setOpen = (str: TasksDialogType | null) => {
    dispatch(setTasksOpen(str))
  }
  const setCurrentRow: React.Dispatch<React.SetStateAction<Task | null>> = (
    v
  ) => {
    if (typeof v === 'function') {
      dispatch(setTasksCurrentRow(v(currentRow)))
    } else {
      dispatch(setTasksCurrentRow(v))
    }
  }

  return { open, setOpen, currentRow, setCurrentRow }
}
