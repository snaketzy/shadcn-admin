import type React from 'react'

export { useTasks } from '@/store/slices/tasks-slice'
export type { TasksDialogType } from '@/store/slices/tasks-slice'

export function TasksProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
