export const dictGroupBadgeColors: Record<string, string> = {
  default: 'bg-sky-100/40 text-sky-900 dark:text-sky-100 border-sky-300',
}

export function getGroupBadgeColor(group: string): string {
  return (
    dictGroupBadgeColors[group] ??
    'bg-neutral-200/40 border-neutral-300 text-neutral-800 dark:text-neutral-200'
  )
}

export const dictGroupOptions: { label: string; value: string }[] = []
