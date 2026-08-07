export function getBadgeColor(value: string | null): string {
  if (!value) return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200'
  const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    'bg-blue-100/60 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200',
    'bg-emerald-100/60 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200',
    'bg-purple-100/60 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200',
    'bg-amber-100/60 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200',
    'bg-rose-100/60 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200',
    'bg-cyan-100/60 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200',
    'bg-violet-100/60 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200',
  ]
  return colors[hash % colors.length]
}
