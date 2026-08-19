import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type DateValue = string | Date | undefined

type DatePickerProps = {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** 是否显示清除按钮（默认 true） */
  allowClear?: boolean
  /** 透传给 Calendar 的 disabled 规则，默认 undefined（不禁用任何日期） */
  calendarDisabled?: (date: Date) => boolean
  /** 显示格式，默认 yyyy/MM/dd */
  displayFormat?: string
}

export function DatePicker({
  selected,
  onSelect,
  placeholder = '请选择日期',
  className,
  disabled = false,
  allowClear = true,
  calendarDisabled,
  displayFormat = 'yyyy/MM/dd',
}: DatePickerProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            disabled={disabled}
            data-empty={!selected}
            className={cn(
              'w-full justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
              allowClear && selected && !disabled ? 'pe-10' : ''
            )}
          >
            {selected ? (
              format(selected, displayFormat)
            ) : (
              <span>{placeholder}</span>
            )}
            <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            captionLayout='dropdown'
            selected={selected}
            onSelect={onSelect}
            disabled={calendarDisabled}
          />
        </PopoverContent>
      </Popover>
      {allowClear && selected && !disabled ? (
        <button
          type='button'
          aria-label='清除日期'
          onClick={(e) => {
            e.stopPropagation()
            onSelect(undefined)
          }}
          className='absolute end-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          tabIndex={-1}
        >
          <X className='size-3.5' />
        </button>
      ) : null}
    </div>
  )
}

export function toISODateOnly(value: DateValue): string {
  if (!value) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
    const parsed = parseISO(value)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  return ''
}

export function parseDateOnly(value: DateValue): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const iso = toISODateOnly(value)
    if (!iso) return undefined
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  return undefined
}

type DateTimePickerProps = {
  /** ISO 字符串（YYYY-MM-DDTHH:mm 或 YYYY-MM-DD HH:mm 或仅日期） */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** 是否显示清除按钮（默认 true） */
  allowClear?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '请选择日期时间',
  className,
  disabled = false,
  allowClear = true,
}: DateTimePickerProps) {
  const dateValue = parseDateOnly(value)
  const timeValue = (() => {
    if (!value) return ''
    const m =
      typeof value === 'string'
        ? value.match(/T(\d{2}:\d{2})/) || value.match(/ (\d{2}:\d{2})/)
        : null
    return m ? m[1] : ''
  })()

  const hasValue = Boolean(dateValue || timeValue)

  const handleDateChange = (d: Date | undefined) => {
    const date = d ? toISODateOnly(d) : ''
    if (!date && !timeValue) {
      onChange('')
      return
    }
    if (!date) {
      onChange(`T${timeValue}`.replace(/^T/, ''))
      return
    }
    onChange(`${date} ${timeValue}`.trim())
  }

  const handleTimeChange = (t: string) => {
    const date = dateValue ? toISODateOnly(dateValue) : ''
    if (!date && !t) {
      onChange('')
      return
    }
    onChange(`${date} ${t}`.trim())
  }

  return (
    <div
      className={cn(
        'relative flex w-full items-center gap-2',
        allowClear && hasValue && !disabled ? 'pr-7' : '',
        className
      )}
    >
      <div className='min-w-0 flex-1'>
        <DatePicker
          selected={dateValue}
          onSelect={handleDateChange}
          placeholder={placeholder}
          disabled={disabled}
          allowClear={allowClear}
        />
      </div>
      <div className='relative w-36 shrink-0'>
        <Input
          type='time'
          step={60}
          disabled={disabled}
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          className='pr-8'
        />
        <Clock className='pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50' />
      </div>
      {allowClear && hasValue && !disabled ? (
        <button
          type='button'
          aria-label='清除日期时间'
          onClick={(e) => {
            e.stopPropagation()
            onChange('')
          }}
          className='absolute end-0 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          tabIndex={-1}
        >
          <X className='size-4' />
        </button>
      ) : null}
    </div>
  )
}
