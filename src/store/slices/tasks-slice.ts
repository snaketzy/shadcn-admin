import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { type Task } from '@/features/tasks/data/schema'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

type TasksState = {
  open: TasksDialogType | null
  currentRow: Task | null
}

const initialState: TasksState = {
  open: null,
  currentRow: null,
}

const slice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<TasksDialogType | null>) => {
      const str = action.payload
      if (str === null) {
        state.open = null
        return
      }
      state.open = state.open === str ? null : str
    },
    setCurrentRow: (state, action: PayloadAction<Task | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen, setCurrentRow } = slice.actions
export default slice.reducer

export const useTasks = () => {
  const dispatch = useAppDispatch()
  const { open, currentRow } = useAppSelector((s) => s.tasks)
  return {
    open,
    setOpen: (v: TasksDialogType | null) => dispatch(setOpen(v)),
    currentRow,
    setCurrentRow: (v: Task | null | ((prev: Task | null) => Task | null)) => {
      dispatch(setCurrentRow(typeof v === 'function' ? (v as (prev: Task | null) => Task | null)(currentRow) : v))
    },
  }
}
