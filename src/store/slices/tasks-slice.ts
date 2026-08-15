import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Task } from '@/features/tasks/data/schema'

export type TasksDialogType = 'create' | 'update' | 'delete' | 'import'

type TasksState = {
  open: TasksDialogType | null
  currentRow: Task | null
}

const initialState: TasksState = {
  open: null,
  currentRow: null,
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<TasksDialogType | null>) => {
      const next = action.payload
      state.open = state.open === next ? null : next
    },
    setCurrentRow: (state, action: PayloadAction<Task | null>) => {
      state.currentRow = action.payload
    },
  },
})

export const { setOpen: setTasksOpen, setCurrentRow: setTasksCurrentRow } =
  tasksSlice.actions
export const tasksReducer = tasksSlice.reducer
