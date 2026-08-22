import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Search,
  X,
  Ship,
  User,
  ChevronsUpDown,
  Check,
  Briefcase,
  UserCheck,
  Wrench,
  Compass,
  Plus,
  Pencil,
  Paperclip as PaperclipIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  DatePicker,
  DateTimePicker,
  parseDateOnly,
  toISODateOnly,
} from '@/components/date-picker'
import {
  CasesServiceContactMultiPickerDialog,
  type CasesServiceContactMultiPickerResult,
} from '@/features/cases/components/cases-service-contact-multi-picker-dialog'
import {
  fetchContactAll,
  fetchContactGroups,
  type Contact,
  type ContactDictEntry,
} from '@/features/contacts/api/client'
import {
  AgentContactPickerDialog,
  type AgentContactPickerResult,
} from '@/features/contacts/components/agent-contact-picker-dialog'
import {
  ShipyardContactPickerDialog,
  type ShipyardContactPickerResult,
} from '@/features/contacts/components/shipyard-contact-picker-dialog'
import {
  SurveyorContactPickerDialog,
  type SurveyorContactPickerResult,
} from '@/features/contacts/components/surveyor-contact-picker-dialog'
import {
  fetchCaseDictByKeyPrefix,
  type CaseDict,
} from '@/features/dictionaries/api/client'
import {
  fetchOwnerAll,
  fetchOwnerGroups,
  type Owner,
} from '@/features/owners/api/client'
import {
  OwnerPickerDialog,
  type OwnerPickerResult,
} from '@/features/owners/components/owner-picker-dialog'
import {
  SuperintendentPickerDialog,
  type SuperintendentPickerResult,
} from '@/features/owners/components/superintendent-picker-dialog'
import {
  fetchSupplierAll,
  type Supplier,
} from '@/features/suppliers/api/client'
import {
  SupplierPickerDialog,
  type SupplierPickerResult,
} from '@/features/suppliers/components/supplier-picker-dialog'
import {
  fetchVesselAll,
  fetchVesselGroups,
  type Vessel,
} from '@/features/users/api/client'
import {
  VesselPickerDialog,
  type VesselPickerResult,
} from '@/features/users/components/vessel-picker-dialog'
import {
  createCase,
  updateCase,
  fetchCaseInquiryListByCaseId,
  replaceCaseInquiryByCaseId,
  fetchCaseInquiryKeywordCheck,
  fetchCaseDetail,
  parseAttachments,
  stringifyAttachments,
  formatAttachmentSize,
  triggerAttachmentDownload,
  openAttachmentInNewTab,
  isImageAttachment,
  isTextAttachment,
  isPdfAttachment,
  uploadInquiryAttachmentToCos,
  readAttachmentTextContent,
  type CaseMemoAttachment,
} from '../api/client'
import type { Case } from '../data/schema'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateAsHyphen(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const str = String(raw).trim()
  if (!str) return ''
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str) ||
    /^\d{4}\d{2}\d{2}$/.test(str)
  ) {
    const normalized = /^\d{8}$/.test(str)
      ? `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
      : str.replace(/\//g, '-')
    const [y, m, day] = normalized.split('-').map((s) => parseInt(s, 10))
    if (
      !Number.isNaN(y) &&
      !Number.isNaN(m) &&
      !Number.isNaN(day) &&
      y >= 1000 &&
      m >= 1 &&
      m <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${y}-${pad2(m)}-${pad2(day)}`
    }
  }
  const d = new Date(str)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }
  return str
}

function formatDateTimeMinute(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const str = String(raw).trim()
  if (!str) return ''
  const m1 = str.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::\d{1,2})?/
  )
  if (m1) {
    const [, y, m, d, hh, mm] = m1
    return `${y}-${pad2(Number(m))}-${pad2(Number(d))} ${pad2(Number(hh))}:${pad2(Number(mm))}`
  }
  const m2 = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (m2) {
    const [, y, m, d, hh, mm] = m2
    return `${y}-${m}-${d} ${hh}:${mm}`
  }
  if (
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str) ||
    /^\d{4}\d{2}\d{2}$/.test(str)
  ) {
    return formatDateAsHyphen(str) + ' 00:00'
  }
  const d = new Date(str)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const hh = d.getHours()
    const mm = d.getMinutes()
    return `${y}-${pad2(m)}-${pad2(day)} ${pad2(hh)}:${pad2(mm)}`
  }
  return str
}

function toDatetimeLocalValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const str = String(raw).trim()
  if (!str) return ''
  const m1 = str.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})/
  )
  if (m1) {
    const [, y, m, d, hh, mm] = m1
    return `${y}-${pad2(Number(m))}-${pad2(Number(d))}T${pad2(Number(hh))}:${pad2(Number(mm))}`
  }
  const m2 = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (m2) {
    const [, y, m, d, hh, mm] = m2
    return `${y}-${m}-${d}T${hh}:${mm}`
  }
  const hyphenDate = formatDateAsHyphen(str)
  if (hyphenDate && /^\d{4}-\d{2}-\d{2}$/.test(hyphenDate)) {
    return `${hyphenDate}T00:00`
  }
  const d = new Date(str)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const hh = d.getHours()
    const mm = d.getMinutes()
    return `${y}-${pad2(m)}-${pad2(day)}T${pad2(hh)}:${pad2(mm)}`
  }
  return ''
}

function normalizeDatetimeForStorage(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const str = String(raw).trim()
  if (!str) return null
  const m = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  )
  if (m) {
    const [, y, mo, d, hh, mm] = m
    return `${y}-${mo}-${d} ${hh}:${mm}:00`
  }
  const f = formatDateTimeMinute(str)
  if (f) return f + ':00'
  return null
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TOTAL_ATTACHMENT_SIZE = 12 * 1024 * 1024 // 12MB
const ALLOWED_ATTACHMENT_EXTS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
]

function filenameAllowedInquiry(name: string): boolean {
  const i = name.lastIndexOf('.')
  if (i < 0) return false
  const ext = name.slice(i + 1).toLowerCase()
  return ALLOWED_ATTACHMENT_EXTS.includes(ext)
}

function readInquiryFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

const formSchema = z.object({
  vessel_name: z.string().optional().catch(''),
  invoice_number: z.string().optional().catch(''),
  order_number: z.string().optional().catch(''),
  case_inquiry_keyword: z.string().optional().catch(''),
  case_progress: z.string().optional().catch(''),
  case_urgent: z.string().optional().catch(''),
  case_inquiry_type: z.string().optional().catch(''),
  case_inquiry_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_follow_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_uptodate_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_should_handle_today: z.string().optional().catch(''),
  owner_following: z.string().optional().catch(''),
  owner_following_id: z
    .preprocess((v) => {
      if (v === null || v === undefined || v === '') return ''
      const n = Number(v)
      return Number.isNaN(n) ? '' : String(n)
    }, z.string().optional().catch(''))
    .optional()
    .catch(''),
  shipyard_business: z.string().optional().catch(''),
  case_agent: z.string().optional().catch(''),
  case_superintendent: z.string().optional().catch(''),
  case_superintendent_id: z
    .preprocess((v) => {
      if (v === null || v === undefined || v === '') return ''
      const n = Number(v)
      return Number.isNaN(n) ? '' : String(n)
    }, z.string().optional().catch(''))
    .optional()
    .catch(''),
  case_surveyor: z.string().optional().catch(''),
  case_delivery_or_service_incharge: z.string().optional().catch(''),
  case_delivery_or_service_incharge_id: z
    .string()
    .nullable()
    .optional()
    .catch(null),
  case_delivery_or_service_deadline: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_eta_cargo_ready_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_etb_cargo_departure_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_etd_cargo_delivery_date: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  vessel_position: z.string().optional().catch(''),
  case_settlement_done: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_personal_register_completed: z.string().optional().catch(''),
  case_business_register_completed: z.string().optional().catch(''),
  case_e_filing_completed: z.string().optional().catch(''),
  case_paper_based_filing_completed: z.string().optional().catch(''),
  case_epd: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_spd: z
    .preprocess(
      (v) => (v === undefined ? '' : formatDateAsHyphen(v)),
      z.string()
    )
    .optional()
    .catch(''),
  case_incharge: z.string().optional().catch(''),
  case_memo_name: z.string().optional().catch(''),
  case_memo_address: z.string().optional().catch(''),
  case_inquiry_attachments: z.string().optional().catch(''),
  case_settlement_attachments: z.string().optional().catch(''),
  case_remark: z.string().optional().catch(''),
  case_rank: z.string().optional().catch(''),
})
type CaseForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

function splitCsvKeys(raw: unknown): string[] {
  if (raw === null || raw === undefined) return []
  const s = String(raw)
  if (!s || s.trim() === '') return []
  return s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

function joinCsvKeys(arr: string[]): string {
  if (!Array.isArray(arr)) return ''
  return arr.filter((s) => s && String(s).trim() !== '').join(',')
}

type CaseInquiry = {
  inquiry_id: number
  case_id: number | null
  case_inquired_date: string | null
  case_inquiry_division_id: number | null
  case_inquiry_type: string | null
  remark: string | null
}

const inquiryFormSchema = z.object({
  case_inquiry_division_id: z
    .preprocess(
      (v) => {
        if (v === null || v === undefined || v === '') return ''
        const n = Number(v)
        return Number.isFinite(n) && n > 0 ? n : ''
      },
      z.union([z.number().positive(), z.string().length(0)])
    )
    .optional()
    .catch(''),
  case_inquiry_type: z.string().optional().catch(''),
  case_inquired_date: z
    .preprocess((v) => {
      if (v === undefined || v === null) return ''
      const norm = toDatetimeLocalValue(v)
      return norm ? norm.replace('T', ' ') : ''
    }, z.string())
    .optional()
    .catch(''),
  remark: z.string().optional().catch(''),
})
type InquiryFormValues = z.infer<typeof inquiryFormSchema>

const DEFAULT_INQUIRY_FORM_VALUES: InquiryFormValues = {
  case_inquiry_division_id: '',
  case_inquiry_type: '',
  case_inquired_date: '',
  remark: '',
}

type CasesActionDialogProps = {
  currentRow?: Case
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mode?: 'dialog' | 'page'
  onCancel?: () => void
  onSuccess?: () => void
}

export function CasesActionDialog({
  currentRow,
  open = true,
  onOpenChange,
  mode = 'dialog',
  onCancel,
  onSuccess,
}: CasesActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow
  const [inquiryList, setInquiryList] = useState<CaseInquiry[]>([])
  const localAddedInquiryIdsRef = useRef<Set<number>>(new Set())

  const { data: vesselRows = [] } = useQuery({
    queryKey: ['vessel-picker-all'],
    queryFn: fetchVesselAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: vesselGroupsData } = useQuery({
    queryKey: ['vessel-picker-groups'],
    queryFn: fetchVesselGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: urgentBRows = [] } = useQuery({
    queryKey: ['case-dict-prefix-B'],
    queryFn: () => fetchCaseDictByKeyPrefix('B'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const todayStr = useMemo<string>(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}-${pad2(m)}-${pad2(day)}`
  }, [])

  const urgentBOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (urgentBRows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [urgentBRows])

  const defaultUrgentBNoKey = useMemo<string>(() => {
    const list = (urgentBRows as CaseDict[]) ?? []
    const noHit = list.find((d) => {
      const v = String(d.dict_value ?? '')
        .trim()
        .toUpperCase()
      return v === 'NO' || v === '否' || v === '普通' || v === '非紧急'
    })
    if (noHit) return String(noHit.dict_key ?? '')
    const first = list[0]
    return first ? String(first.dict_key ?? '') : ''
  }, [urgentBRows])

  const { data: vesselPositionCRows = [] } = useQuery({
    queryKey: ['case-dict-prefix-C'],
    queryFn: () => fetchCaseDictByKeyPrefix('C'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const vesselPositionCOptions = useMemo<
    { value: string; label: string }[]
  >(() => {
    const list = (vesselPositionCRows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [vesselPositionCRows])

  const { data: inqTypeARows = [] } = useQuery({
    queryKey: ['case-dict-prefix-A'],
    queryFn: () => fetchCaseDictByKeyPrefix('A'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const inqTypeAOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (inqTypeARows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [inqTypeARows])

  const { data: inchargeERows = [] } = useQuery({
    queryKey: ['case-dict-prefix-E'],
    queryFn: () => fetchCaseDictByKeyPrefix('E'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const inchargeEOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (inchargeERows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [inchargeERows])

  const defaultInchargeEKey = useMemo<string>(() => {
    const list = (inchargeERows as CaseDict[]) ?? []
    const jerryHit = list.find((d) => {
      const v = String(d.dict_value ?? '').trim()
      return v.toUpperCase() === 'JERRY' || v === 'Jerry' || v === 'jerry'
    })
    if (jerryHit) return String(jerryHit.dict_key ?? '')
    return ''
  }, [inchargeERows])

  const { data: rankDRows = [] } = useQuery({
    queryKey: ['case-dict-prefix-D'],
    queryFn: () => fetchCaseDictByKeyPrefix('D'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const rankDOptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (rankDRows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [rankDRows])

  const rankDKeyToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of rankDOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [rankDOptions])

  const resolveRankDLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = rankDKeyToLabel.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [rankDKeyToLabel]
  )

  const { data: progressRRows = [] } = useQuery({
    queryKey: ['case-dict-prefix-R'],
    queryFn: () => fetchCaseDictByKeyPrefix('R'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const progressROptions = useMemo<{ value: string; label: string }[]>(() => {
    const list = (progressRRows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [progressRRows])

  const defaultProgressRInquiryKey = useMemo<string>(() => {
    const list = (progressRRows as CaseDict[]) ?? []
    const inquiryHit = list.find((d) => {
      const k = String(d.dict_key ?? '').trim()
      const v = String(d.dict_value ?? '')
        .trim()
        .toUpperCase()
      return (
        k === '0' ||
        v === 'INQUIRY' ||
        v.includes('INQUIRY') ||
        v === '询价' ||
        v.includes('询价')
      )
    })
    if (inquiryHit) return String(inquiryHit.dict_key ?? '')
    const first = list[0]
    return first ? String(first.dict_key ?? '') : ''
  }, [progressRRows])

  const progressRKeyToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of progressROptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [progressROptions])

  const resolveProgressRLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = progressRKeyToLabel.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [progressRKeyToLabel]
  )

  const { data: inquiryTypeQRows = [] } = useQuery({
    queryKey: ['case-dict-prefix-Q'],
    queryFn: () => fetchCaseDictByKeyPrefix('Q'),
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const inquiryTypeQOptions = useMemo<
    { value: string; label: string }[]
  >(() => {
    const list = (inquiryTypeQRows as CaseDict[]) ?? []
    return list.map((d) => ({
      value: String(d.dict_key ?? ''),
      label: String(d.dict_value ?? d.dict_key ?? ''),
    }))
  }, [inquiryTypeQRows])

  const inquiryTypeQKeyToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of inquiryTypeQOptions) {
      if (o.value) m.set(String(o.value).toUpperCase(), o.label)
    }
    return m
  }, [inquiryTypeQOptions])

  const resolveInquiryTypeQLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = inquiryTypeQKeyToLabel.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [inquiryTypeQKeyToLabel]
  )

  const getInquiryTypeQBadgeClass = useCallback((label: string): string => {
    if (!label) return ''
    if (label.includes('报价'))
      return 'bg-amber-100/60 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200'
    if (label.includes('竞标') || label.includes('投标'))
      return 'bg-blue-100/60 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200'
    if (label.includes('中标'))
      return 'bg-emerald-100/60 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200'
    if (label.includes('未中') || label.includes('流标'))
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300'
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300'
  }, [])

  const { data: supplierRows = [] } = useQuery({
    queryKey: ['supplier-picker-all'],
    queryFn: fetchSupplierAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const supplierIdNameMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const s of supplierRows as Supplier[]) {
      if (s.supplier_id != null) {
        m.set(
          Number(s.supplier_id),
          s.supplier_shortname || s.supplier_name || ''
        )
      }
    }
    return m
  }, [supplierRows])

  const resolveSupplierNameById = useCallback(
    (rawId: unknown): string => {
      if (rawId === null || rawId === undefined || rawId === '') return ''
      const n = Number(rawId)
      if (!Number.isFinite(n)) return ''
      return supplierIdNameMap.get(n) ?? ''
    },
    [supplierIdNameMap]
  )

  const [rankPopoverOpen, setRankPopoverOpen] = useState(false)
  const [progressPopoverOpen, setProgressPopoverOpen] = useState(false)

  const [vesselPickerOpen, setVesselPickerOpen] = useState(false)
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)
  const [superintendentPickerOpen, setSuperintendentPickerOpen] =
    useState(false)
  const [agentContactPickerOpen, setAgentContactPickerOpen] = useState(false)
  const [shipyardContactPickerOpen, setShipyardContactPickerOpen] =
    useState(false)
  const [surveyorContactPickerOpen, setSurveyorContactPickerOpen] =
    useState(false)
  const [serviceContactPickerOpen, setServiceContactPickerOpen] =
    useState(false)
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false)
  const [inquiryEditingId, setInquiryEditingId] = useState<number | null>(null)
  const [inquirySupplierPickerOpen, setInquirySupplierPickerOpen] =
    useState(false)

  const vesselNameMap = useMemo(() => {
    const map = new Map<string, Vessel>()
    for (const v of vesselRows as Vessel[]) {
      if (v.vessel_name) map.set(String(v.vessel_name), v)
    }
    return map
  }, [vesselRows])

  const { data: ownerRows = [] } = useQuery({
    queryKey: ['owner-picker-all'],
    queryFn: fetchOwnerAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: ownerGroupsData } = useQuery({
    queryKey: ['owner-picker-groups'],
    queryFn: fetchOwnerGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const ownerNameMap = useMemo(() => {
    const map = new Map<string, Owner>()
    for (const o of ownerRows as Owner[]) {
      if (o.owner_name) map.set(String(o.owner_name), o)
    }
    return map
  }, [ownerRows])

  const ownerIdMap = useMemo(() => {
    const map = new Map<string, Owner>()
    for (const o of ownerRows as Owner[]) {
      if (o.owner_id != null) {
        map.set(String(o.owner_id), o)
      }
    }
    return map
  }, [ownerRows])

  const ownerTeamKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        ownerGroupsData as
          { teamDict?: { dict_key: string; dict_value: string }[] } | undefined
      )?.teamDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [ownerGroupsData])

  const ownerDeptKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        ownerGroupsData as
          | { departmentDict?: { dict_key: string; dict_value: string }[] }
          | undefined
      )?.departmentDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [ownerGroupsData])

  const ownerRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        ownerGroupsData as
          { rankDict?: { dict_key: string; dict_value: string }[] } | undefined
      )?.rankDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [ownerGroupsData])

  const resolveOwnerTeamLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = ownerTeamKeyMap.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [ownerTeamKeyMap]
  )

  const resolveOwnerDeptLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = ownerDeptKeyMap.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [ownerDeptKeyMap]
  )

  const resolveOwnerRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = ownerRankKeyMap.get(p.toUpperCase())
      if (hit) return hit
      return p
    },
    [ownerRankKeyMap]
  )

  const resolveOwnerDisplay = useCallback(
    (
      ownerName: string | null | undefined,
      ownerId?: string | number | null | undefined
    ): {
      name: string
      email: string
      phone: string
      team: string
      department: string
      rank: string
    } => {
      const idStr =
        ownerId != null && ownerId !== '' && !Number.isNaN(Number(ownerId))
          ? String(ownerId)
          : ''
      if (idStr) {
        const o = ownerIdMap.get(idStr)
        if (o) {
          return {
            name: o.owner_name ?? '',
            email: o.owner_email ?? '',
            phone: o.owner_phone ?? '',
            team: resolveOwnerTeamLabel(o.owner_team),
            department: resolveOwnerDeptLabel(o.owner_department),
            rank: resolveOwnerRankLabel(o.owner_rank),
          }
        }
      }
      const name = ownerName ?? ''
      if (!name)
        return {
          name: '',
          email: '',
          phone: '',
          team: '',
          department: '',
          rank: '',
        }
      const o = ownerNameMap.get(name)
      if (o) {
        return {
          name: o.owner_name ?? '',
          email: o.owner_email ?? '',
          phone: o.owner_phone ?? '',
          team: resolveOwnerTeamLabel(o.owner_team),
          department: resolveOwnerDeptLabel(o.owner_department),
          rank: resolveOwnerRankLabel(o.owner_rank),
        }
      }
      return { name, email: '', phone: '', team: '', department: '', rank: '' }
    },
    [
      ownerIdMap,
      ownerNameMap,
      resolveOwnerTeamLabel,
      resolveOwnerDeptLabel,
      resolveOwnerRankLabel,
    ]
  )

  const superintendentRows = useMemo<Owner[]>(() => {
    return (ownerRows as Owner[]).filter((o) => {
      const dept = String(o.owner_department ?? '').toUpperCase()
      return dept === 'F1' || dept === 'F4'
    })
  }, [ownerRows])

  const superintendentNameMap = useMemo(() => {
    const m = new Map<string, Owner>()
    for (const o of superintendentRows) {
      if (o.owner_name) m.set(String(o.owner_name), o)
    }
    return m
  }, [superintendentRows])

  const superintendentIdMap = useMemo(() => {
    const m = new Map<string, Owner>()
    for (const o of superintendentRows) {
      if (o.owner_id != null) {
        m.set(String(o.owner_id), o)
      }
    }
    return m
  }, [superintendentRows])

  const resolveSuperintendentDisplay = useCallback(
    (
      name: string | null | undefined,
      ownerId?: string | number | null | undefined
    ): {
      name: string
      email: string
      phone: string
      team: string
      department: string
      rank: string
    } => {
      const idStr =
        ownerId != null && ownerId !== '' && !Number.isNaN(Number(ownerId))
          ? String(ownerId)
          : ''
      if (idStr) {
        const o = superintendentIdMap.get(idStr)
        if (o) {
          return {
            name: o.owner_name ?? '',
            email: o.owner_email ?? '',
            phone: o.owner_phone ?? '',
            team: resolveOwnerTeamLabel(o.owner_team),
            department: resolveOwnerDeptLabel(o.owner_department),
            rank: resolveOwnerRankLabel(o.owner_rank),
          }
        }
      }
      const n = name ?? ''
      if (!n)
        return {
          name: '',
          email: '',
          phone: '',
          team: '',
          department: '',
          rank: '',
        }
      const o = superintendentNameMap.get(n)
      if (o) {
        return {
          name: o.owner_name ?? '',
          email: o.owner_email ?? '',
          phone: o.owner_phone ?? '',
          team: resolveOwnerTeamLabel(o.owner_team),
          department: resolveOwnerDeptLabel(o.owner_department),
          rank: resolveOwnerRankLabel(o.owner_rank),
        }
      }
      return {
        name: n,
        email: '',
        phone: '',
        team: '',
        department: '',
        rank: '',
      }
    },
    [
      superintendentNameMap,
      superintendentIdMap,
      resolveOwnerTeamLabel,
      resolveOwnerDeptLabel,
      resolveOwnerRankLabel,
    ]
  )

  const superintendentDeptLabel = useMemo(() => {
    const f1 = ownerDeptKeyMap.get('F1') || 'F1'
    const f4 = ownerDeptKeyMap.get('F4') || 'F4'
    return `${f1}/${f4}`
  }, [ownerDeptKeyMap])

  const { data: agentContactAll = [] } = useQuery({
    queryKey: ['agent-contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: agentContactGroups } = useQuery({
    queryKey: ['agent-contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const agentContactRows = useMemo<Contact[]>(() => {
    return (agentContactAll as Contact[]).filter(
      (c) => String(c.contact_type ?? '').toUpperCase() === 'J1'
    )
  }, [agentContactAll])

  const agentContactNameMap = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of agentContactRows) {
      if (c.contact_name) m.set(String(c.contact_name), c)
    }
    return m
  }, [agentContactRows])

  const agentContactRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (agentContactGroups as { rankDict?: ContactDictEntry[] } | undefined)
        ?.rankDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [agentContactGroups])

  const agentContactDivisionKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (agentContactGroups as { divisionDict?: ContactDictEntry[] } | undefined)
        ?.divisionDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [agentContactGroups])

  const agentContactTypeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (agentContactGroups as { typeDict?: ContactDictEntry[] } | undefined)
        ?.typeDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [agentContactGroups])

  const resolveAgentContactRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = agentContactRankKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [agentContactRankKeyMap]
  )

  const resolveAgentContactDivisionLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = agentContactDivisionKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [agentContactDivisionKeyMap]
  )

  const agentContactTypeLabel = useMemo(() => {
    return agentContactTypeKeyMap.get('J1') || 'J1'
  }, [agentContactTypeKeyMap])

  const resolveAgentContactDisplay = useCallback(
    (
      name: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      rank: string
      division: string
    } => {
      const n = name ?? ''
      if (!n) return { name: '', mobile: '', email: '', rank: '', division: '' }
      const c = agentContactNameMap.get(n)
      if (c) {
        return {
          name: c.contact_name ?? '',
          mobile: c.contact_mobile ?? '',
          email: c.contact_email ?? '',
          rank: resolveAgentContactRankLabel(c.contact_rank),
          division: resolveAgentContactDivisionLabel(c.contact_division_type),
        }
      }
      return { name: n, mobile: '', email: '', rank: '', division: '' }
    },
    [
      agentContactNameMap,
      resolveAgentContactRankLabel,
      resolveAgentContactDivisionLabel,
    ]
  )

  const { data: shipyardContactAll = [] } = useQuery({
    queryKey: ['shipyard-contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: shipyardContactGroups } = useQuery({
    queryKey: ['shipyard-contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const shipyardContactRows = useMemo<Contact[]>(() => {
    return (shipyardContactAll as Contact[]).filter(
      (c) => String(c.contact_type ?? '').toUpperCase() === 'J4'
    )
  }, [shipyardContactAll])

  const shipyardContactNameMap = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of shipyardContactRows) {
      if (c.contact_name) m.set(String(c.contact_name), c)
    }
    return m
  }, [shipyardContactRows])

  const shipyardContactRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (shipyardContactGroups as { rankDict?: ContactDictEntry[] } | undefined)
        ?.rankDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [shipyardContactGroups])

  const shipyardContactDivisionKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        shipyardContactGroups as
          { divisionDict?: ContactDictEntry[] } | undefined
      )?.divisionDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [shipyardContactGroups])

  const resolveShipyardContactRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = shipyardContactRankKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [shipyardContactRankKeyMap]
  )

  const resolveShipyardContactDivisionLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = shipyardContactDivisionKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [shipyardContactDivisionKeyMap]
  )

  const resolveShipyardContactDisplay = useCallback(
    (
      name: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      rank: string
      division: string
    } => {
      const n = name ?? ''
      if (!n) return { name: '', mobile: '', email: '', rank: '', division: '' }
      const c = shipyardContactNameMap.get(n)
      if (c) {
        return {
          name: c.contact_name ?? '',
          mobile: c.contact_mobile ?? '',
          email: c.contact_email ?? '',
          rank: resolveShipyardContactRankLabel(c.contact_rank),
          division: resolveShipyardContactDivisionLabel(
            c.contact_division_type
          ),
        }
      }
      return { name: n, mobile: '', email: '', rank: '', division: '' }
    },
    [
      shipyardContactNameMap,
      resolveShipyardContactRankLabel,
      resolveShipyardContactDivisionLabel,
    ]
  )

  const { data: surveyorContactAll = [] } = useQuery({
    queryKey: ['surveyor-contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const { data: surveyorContactGroups } = useQuery({
    queryKey: ['surveyor-contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const surveyorContactRows = useMemo<Contact[]>(() => {
    return (surveyorContactAll as Contact[]).filter(
      (c) => String(c.contact_type ?? '').toUpperCase() === 'J2'
    )
  }, [surveyorContactAll])

  const surveyorContactNameMap = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of surveyorContactRows) {
      if (c.contact_name) m.set(String(c.contact_name), c)
    }
    return m
  }, [surveyorContactRows])

  const surveyorContactRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (surveyorContactGroups as { rankDict?: ContactDictEntry[] } | undefined)
        ?.rankDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [surveyorContactGroups])

  const surveyorContactDivisionKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        surveyorContactGroups as
          { divisionDict?: ContactDictEntry[] } | undefined
      )?.divisionDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [surveyorContactGroups])

  const surveyorContactTypeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (surveyorContactGroups as { typeDict?: ContactDictEntry[] } | undefined)
        ?.typeDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [surveyorContactGroups])

  const resolveSurveyorContactRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = surveyorContactRankKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [surveyorContactRankKeyMap]
  )

  const resolveSurveyorContactDivisionLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = surveyorContactDivisionKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [surveyorContactDivisionKeyMap]
  )

  const surveyorContactTypeLabel = useMemo(() => {
    return surveyorContactTypeKeyMap.get('J2') || 'J2'
  }, [surveyorContactTypeKeyMap])

  const resolveSurveyorContactDisplay = useCallback(
    (
      name: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      rank: string
      division: string
    } => {
      const n = name ?? ''
      if (!n) return { name: '', mobile: '', email: '', rank: '', division: '' }
      const c = surveyorContactNameMap.get(n)
      if (c) {
        return {
          name: c.contact_name ?? '',
          mobile: c.contact_mobile ?? '',
          email: c.contact_email ?? '',
          rank: resolveSurveyorContactRankLabel(c.contact_rank),
          division: resolveSurveyorContactDivisionLabel(
            c.contact_division_type
          ),
        }
      }
      return { name: n, mobile: '', email: '', rank: '', division: '' }
    },
    [
      surveyorContactNameMap,
      resolveSurveyorContactRankLabel,
      resolveSurveyorContactDivisionLabel,
    ]
  )

  const inchargeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (
        vesselGroupsData as
          | { inchargeDict?: { dict_key: string; dict_value: string }[] }
          | undefined
      )?.inchargeDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [vesselGroupsData])

  const resolveInchargeLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = inchargeKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [inchargeKeyMap]
  )

  const resolveVesselDisplay = useCallback(
    (
      vesselName: string | null | undefined
    ): {
      name: string
      flag: string
      vesselClass: string
      team: string
      incharge: string
    } => {
      const name = vesselName ?? ''
      if (!name)
        return { name: '', flag: '', vesselClass: '', team: '', incharge: '' }
      const v = vesselNameMap.get(name)
      if (v) {
        return {
          name: v.vessel_name ?? '',
          flag: v.vessel_flag ?? '',
          vesselClass: v.vessel_class ?? '',
          team: v.vessel_team ?? '',
          incharge: resolveInchargeLabel(v.vessel_incharge),
        }
      }
      return { name, flag: '', vesselClass: '', team: '', incharge: '' }
    },
    [vesselNameMap, resolveInchargeLabel]
  )

  const defaultValues = useMemo<CaseForm>(
    () =>
      isEdit
        ? {
            vessel_name: currentRow.vessel_name ?? '',
            invoice_number: currentRow.invoice_number ?? '',
            order_number: currentRow.order_number ?? '',
            case_inquiry_keyword: currentRow.case_inquiry_keyword ?? '',
            case_progress: currentRow.case_progress ?? '',
            case_urgent: currentRow.case_urgent ?? '',
            case_inquiry_type: currentRow.case_inquiry_type ?? '',
            case_inquiry_date: formatDateAsHyphen(currentRow.case_inquiry_date),
            case_follow_date: formatDateAsHyphen(currentRow.case_follow_date),
            case_uptodate_date: formatDateAsHyphen(
              currentRow.case_uptodate_date
            ),
            case_should_handle_today: currentRow.case_should_handle_today ?? '',
            owner_following: currentRow.owner_following ?? '',
            owner_following_id:
              currentRow.owner_following_id != null &&
              currentRow.owner_following_id !== 0 &&
              !Number.isNaN(Number(currentRow.owner_following_id))
                ? String(currentRow.owner_following_id)
                : '',
            shipyard_business: currentRow.shipyard_business ?? '',
            case_agent: currentRow.case_agent ?? '',
            case_superintendent: currentRow.case_superintendent ?? '',
            case_superintendent_id:
              (currentRow as any).case_superintendent_id != null &&
              (currentRow as any).case_superintendent_id !== 0 &&
              !Number.isNaN(Number((currentRow as any).case_superintendent_id))
                ? String((currentRow as any).case_superintendent_id)
                : '',
            case_surveyor: currentRow.case_surveyor ?? '',
            case_delivery_or_service_incharge:
              currentRow.case_delivery_or_service_incharge ?? '',
            case_delivery_or_service_incharge_id:
              currentRow.case_delivery_or_service_incharge_id ?? null,
            case_delivery_or_service_deadline: formatDateAsHyphen(
              currentRow.case_delivery_or_service_deadline
            ),
            case_eta_cargo_ready_date: formatDateAsHyphen(
              currentRow.case_eta_cargo_ready_date
            ),
            case_etb_cargo_departure_date: formatDateAsHyphen(
              currentRow.case_etb_cargo_departure_date
            ),
            case_etd_cargo_delivery_date: formatDateAsHyphen(
              currentRow.case_etd_cargo_delivery_date
            ),
            vessel_position: currentRow.vessel_position ?? '',
            case_settlement_done: formatDateAsHyphen(
              currentRow.case_settlement_done
            ),
            case_personal_register_completed:
              currentRow.case_personal_register_completed ?? '',
            case_business_register_completed:
              currentRow.case_business_register_completed ?? '',
            case_e_filing_completed: currentRow.case_e_filing_completed ?? '',
            case_paper_based_filing_completed:
              currentRow.case_paper_based_filing_completed ?? '',
            case_epd: formatDateAsHyphen(currentRow.case_epd),
            case_spd: formatDateAsHyphen(currentRow.case_spd),
            case_incharge: currentRow.case_incharge ?? '',
            case_memo_name: currentRow.case_memo_name ?? '',
            case_memo_address: currentRow.case_memo_address ?? '',
            case_inquiry_attachments:
              (currentRow as any).case_inquiry_attachments ?? '',
            case_settlement_attachments:
              (currentRow as any).case_settlement_attachments ?? '',
            case_remark: (currentRow as any).case_remark ?? '',
            case_rank: currentRow.case_rank ?? '',
          }
        : {
            vessel_name: '',
            invoice_number: '',
            order_number: '',
            case_inquiry_keyword: '',
            case_progress: defaultProgressRInquiryKey,
            case_urgent: defaultUrgentBNoKey,
            case_inquiry_type: '',
            case_inquiry_date: todayStr,
            case_follow_date: todayStr,
            case_uptodate_date: todayStr,
            case_should_handle_today: defaultUrgentBNoKey,
            owner_following: '',
            owner_following_id: '',
            shipyard_business: '',
            case_agent: '',
            case_superintendent: '',
            case_superintendent_id: '',
            case_surveyor: '',
            case_delivery_or_service_incharge: '',
            case_delivery_or_service_incharge_id: null,
            case_delivery_or_service_deadline: '',
            case_eta_cargo_ready_date: '',
            case_etb_cargo_departure_date: '',
            case_etd_cargo_delivery_date: '',
            vessel_position: '',
            case_settlement_done: '',
            case_personal_register_completed: defaultUrgentBNoKey,
            case_business_register_completed: defaultUrgentBNoKey,
            case_e_filing_completed: defaultUrgentBNoKey,
            case_paper_based_filing_completed: defaultUrgentBNoKey,
            case_epd: '',
            case_spd: '',
            case_incharge: defaultInchargeEKey,
            case_memo_name: '',
            case_memo_address: '',
            case_inquiry_attachments: '',
            case_settlement_attachments: '',
            case_remark: '',
            case_rank: '',
          },
    [
      isEdit,
      currentRow,
      defaultUrgentBNoKey,
      todayStr,
      defaultProgressRInquiryKey,
      defaultInchargeEKey,
    ]
  )

  const form = useForm<CaseForm>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  })

  const formVesselName = form.watch('vessel_name')
  const formInquiryKeyword = form.watch('case_inquiry_keyword')
  const formInquiryDate = form.watch('case_inquiry_date')
  const formOwnerFollowing = form.watch('owner_following')
  const formOwnerFollowingId = form.watch('owner_following_id')
  const formCaseAgent = form.watch('case_agent')
  const formCaseSuperintendent = form.watch('case_superintendent')
  const formCaseSuperintendentId = form.watch('case_superintendent_id')
  const formShipyardBusiness = form.watch('shipyard_business')
  const formCaseSurveyor = form.watch('case_surveyor')

  const vesselDisplay = useMemo(() => {
    return resolveVesselDisplay(formVesselName ?? '')
  }, [formVesselName, resolveVesselDisplay])

  const ownerDisplay = useMemo(() => {
    return resolveOwnerDisplay(
      formOwnerFollowing ?? '',
      formOwnerFollowingId ?? ''
    )
  }, [formOwnerFollowing, formOwnerFollowingId, resolveOwnerDisplay])

  const agentContactDisplay = useMemo(() => {
    return resolveAgentContactDisplay(formCaseAgent ?? '')
  }, [formCaseAgent, resolveAgentContactDisplay])

  const superintendentDisplay = useMemo(() => {
    return resolveSuperintendentDisplay(
      formCaseSuperintendent ?? '',
      formCaseSuperintendentId ?? ''
    )
  }, [
    formCaseSuperintendent,
    formCaseSuperintendentId,
    resolveSuperintendentDisplay,
  ])

  const shipyardContactDisplay = useMemo(() => {
    return resolveShipyardContactDisplay(formShipyardBusiness ?? '')
  }, [formShipyardBusiness, resolveShipyardContactDisplay])

  const surveyorContactDisplay = useMemo(() => {
    return resolveSurveyorContactDisplay(formCaseSurveyor ?? '')
  }, [formCaseSurveyor, resolveSurveyorContactDisplay])

  const { data: serviceContactAll = [] } = useQuery({
    queryKey: ['contact-picker-all'],
    queryFn: fetchContactAll,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const serviceContactIdMap = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of serviceContactAll as Contact[]) {
      if (c.contact_id != null) {
        m.set(String(c.contact_id), c)
      }
    }
    return m
  }, [serviceContactAll])

  const serviceContactNameMap = useMemo(() => {
    const m = new Map<string, Contact>()
    for (const c of serviceContactAll as Contact[]) {
      const n = (c.contact_name ?? '').trim()
      if (n) m.set(n, c)
    }
    return m
  }, [serviceContactAll])

  const { data: serviceContactGroups } = useQuery({
    queryKey: ['service-contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: mode === 'page' || open,
    staleTime: 60000,
  })

  const serviceContactRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (serviceContactGroups as { rankDict?: ContactDictEntry[] } | undefined)
        ?.rankDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [serviceContactGroups])

  const serviceContactTypeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    const list =
      (serviceContactGroups as { typeDict?: ContactDictEntry[] } | undefined)
        ?.typeDict ?? []
    for (const d of list) {
      m.set(String(d.dict_key).toUpperCase(), d.dict_value)
    }
    return m
  }, [serviceContactGroups])

  const resolveServiceContactRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = serviceContactRankKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [serviceContactRankKeyMap]
  )

  const resolveServiceContactTypeLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const byKey = serviceContactTypeKeyMap.get(p.toUpperCase())
      if (byKey) return byKey
      return p
    },
    [serviceContactTypeKeyMap]
  )

  const formCaseServiceIncharge = form.watch(
    'case_delivery_or_service_incharge'
  )
  const formCaseServiceInchargeId = form.watch(
    'case_delivery_or_service_incharge_id'
  )

  const resolveServiceContactInitialIds = useCallback((): string[] => {
    const idRaw = form.getValues('case_delivery_or_service_incharge_id')
    const nameRaw = form.getValues('case_delivery_or_service_incharge')
    if (idRaw != null && String(idRaw).trim() !== '') {
      return String(idRaw)
        .split(',')
        .map((p) => p.trim())
        .filter((x) => x !== '')
    }
    if (nameRaw != null && String(nameRaw).trim() !== '') {
      const names = String(nameRaw)
        .split(/[,，]\s*/)
        .map((p) => p.trim())
        .filter(Boolean)
      const ids: string[] = []
      for (const n of names) {
        const c = serviceContactNameMap.get(n.trim())
        if (c && c.contact_id != null && String(c.contact_id) !== '') {
          ids.push(String(c.contact_id))
        }
      }
      return ids
    }
    return []
  }, [serviceContactNameMap, form])

  const serviceContactDisplay = useMemo((): {
    count: number
    names: string[]
    mobiles: string[]
    emails: string[]
    ranks: string[]
    divisions: string[]
    rawNames: string
  } => {
    const idRaw = formCaseServiceInchargeId ?? null
    const nameRaw = formCaseServiceIncharge ?? ''
    if (
      (idRaw == null || String(idRaw).trim() === '') &&
      (nameRaw == null || String(nameRaw).trim() === '')
    ) {
      return {
        count: 0,
        names: [],
        mobiles: [],
        emails: [],
        ranks: [],
        divisions: [],
        rawNames: '',
      }
    }
    const items: Contact[] = []
    if (idRaw != null && String(idRaw).trim() !== '') {
      const ids = String(idRaw)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      for (const id of ids) {
        const c = serviceContactIdMap.get(id)
        if (c) items.push(c)
      }
    }
    if (items.length === 0 && nameRaw && String(nameRaw).trim() !== '') {
      const names = String(nameRaw)
        .split(/[,，]\s*/)
        .map((p) => p.trim())
        .filter(Boolean)
      for (const n of names) {
        const c = serviceContactNameMap.get(n.trim())
        if (c) items.push(c)
      }
    }
    const names = items.map((c) => c.contact_name ?? '').filter(Boolean)
    const mobiles = items.map((c) => c.contact_mobile ?? '').filter(Boolean)
    const emails = items.map((c) => c.contact_email ?? '').filter(Boolean)
    const ranks = items
      .map((c) => resolveServiceContactRankLabel(c.contact_rank))
      .filter(Boolean)
    const divisions = items
      .map((c) => resolveServiceContactTypeLabel(c.contact_type))
      .filter(Boolean)
    return {
      count: items.length,
      names,
      mobiles,
      emails,
      ranks,
      divisions,
      rawNames: names.length > 0 ? names.join('，') : (nameRaw ?? ''),
    }
  }, [
    formCaseServiceIncharge,
    formCaseServiceInchargeId,
    serviceContactIdMap,
    serviceContactNameMap,
    resolveServiceContactRankLabel,
    resolveServiceContactTypeLabel,
  ])

  const memoNameEditedRef = useRef(false)

  const [inquiryAttachments, setInquiryAttachments] = useState<
    CaseMemoAttachment[]
  >([])
  const inquiryFileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewInquiryAtt, setPreviewInquiryAtt] =
    useState<CaseMemoAttachment | null>(null)
  const [inquiryUploadingCount, setInquiryUploadingCount] = useState(0)
  const [inquiryPreviewText, setInquiryPreviewText] = useState<
    string | null | undefined
  >(undefined)
  const [inquiryPreviewTextLoading, setInquiryPreviewTextLoading] =
    useState(false)

  const [settlementAttachments, setSettlementAttachments] = useState<
    CaseMemoAttachment[]
  >([])
  const settlementFileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewSettlementAtt, setPreviewSettlementAtt] =
    useState<CaseMemoAttachment | null>(null)
  const [settlementPreviewText, setSettlementPreviewText] = useState<
    string | null | undefined
  >(undefined)
  const [settlementPreviewTextLoading, setSettlementPreviewTextLoading] =
    useState(false)

  const keywordDuplicateCheckRef = useRef<{
    lastCheckedNormalized: string
    lastResultExists: boolean
    lastMatchedCaseId?: number
    lastMatchedKeyword?: string
    isChecking: boolean
    pendingCheckToken?: number
  }>({
    lastCheckedNormalized: '',
    lastResultExists: false,
    isChecking: false,
  })

  const excludeCaseId =
    isEdit && currentRow?.case_id && !Number.isNaN(Number(currentRow.case_id))
      ? Number(currentRow.case_id)
      : undefined

  const runKeywordDuplicateCheck = useCallback(
    async (
      raw: string
    ): Promise<{
      exists: boolean
      matchedCaseId?: number
      matchedKeyword?: string
    }> => {
      const normalized = String(raw ?? '')
        .trim()
        .toLowerCase()
      const state = keywordDuplicateCheckRef.current
      if (!normalized) {
        state.lastCheckedNormalized = ''
        state.lastResultExists = false
        return { exists: false }
      }
      if (state.lastCheckedNormalized === normalized && !state.isChecking) {
        return {
          exists: state.lastResultExists,
          matchedCaseId: state.lastMatchedCaseId,
          matchedKeyword: state.lastMatchedKeyword,
        }
      }
      if (state.isChecking && state.pendingCheckToken) {
        try {
          window.clearTimeout(state.pendingCheckToken)
        } catch (e) {
          // ignore
        }
      }
      state.isChecking = true
      try {
        const result = await fetchCaseInquiryKeywordCheck({
          keyword: normalized,
          excludeCaseId,
        })
        state.lastCheckedNormalized = normalized
        state.lastResultExists = !!result.exists
        state.lastMatchedCaseId = result.matchedCaseId
        state.lastMatchedKeyword = result.matchedKeyword
        return {
          exists: !!result.exists,
          matchedCaseId: result.matchedCaseId,
          matchedKeyword: result.matchedKeyword,
        }
      } finally {
        state.isChecking = false
      }
    },
    [excludeCaseId]
  )

  const setKeywordErrorIfDuplicate = useCallback(
    async (raw: string): Promise<boolean> => {
      if (isEdit) {
        form.clearErrors('case_inquiry_keyword')
        return false
      }
      const normalized = String(raw ?? '').trim()
      if (!normalized) {
        form.clearErrors('case_inquiry_keyword')
        return false
      }
      try {
        const result = await runKeywordDuplicateCheck(normalized)
        if (result.exists) {
          const suffix = result.matchedCaseId
            ? `（已存在于案件 #${result.matchedCaseId}）`
            : ''
          form.setError('case_inquiry_keyword', {
            type: 'manual',
            message: `需求编号/名称已存在，不可重复${suffix}`,
          })
          return true
        }
        form.clearErrors('case_inquiry_keyword')
        return false
      } catch (e) {
        form.clearErrors('case_inquiry_keyword')
        return false
      }
    },
    [form, isEdit, runKeywordDuplicateCheck]
  )

  useEffect(() => {
    if (memoNameEditedRef.current) return
    const parts = [
      formVesselName ?? '',
      formInquiryKeyword ?? '',
      formInquiryDate ?? '',
    ].filter((p) => p && p.trim().length > 0)
    const memoName = parts.join(' // ')
    form.setValue('case_memo_name', memoName, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form, formVesselName, formInquiryKeyword, formInquiryDate])

  const buildFormValuesFromCase = useCallback(
    (row: Case): CaseForm => ({
      vessel_name: row.vessel_name ?? '',
      invoice_number: row.invoice_number ?? '',
      order_number: row.order_number ?? '',
      case_inquiry_keyword: row.case_inquiry_keyword ?? '',
      case_progress: row.case_progress ?? '',
      case_urgent: row.case_urgent ?? '',
      case_inquiry_type: row.case_inquiry_type ?? '',
      case_inquiry_date: formatDateAsHyphen(row.case_inquiry_date),
      case_follow_date: formatDateAsHyphen(row.case_follow_date),
      case_uptodate_date: formatDateAsHyphen(row.case_uptodate_date),
      case_should_handle_today: row.case_should_handle_today ?? '',
      owner_following: row.owner_following ?? '',
      owner_following_id:
        (row as any).owner_following_id != null &&
        (row as any).owner_following_id !== 0 &&
        !Number.isNaN(Number((row as any).owner_following_id))
          ? String((row as any).owner_following_id)
          : '',
      shipyard_business: row.shipyard_business ?? '',
      case_agent: row.case_agent ?? '',
      case_superintendent: row.case_superintendent ?? '',
      case_superintendent_id:
        (row as any).case_superintendent_id != null &&
        (row as any).case_superintendent_id !== 0 &&
        !Number.isNaN(Number((row as any).case_superintendent_id))
          ? String((row as any).case_superintendent_id)
          : '',
      case_surveyor: row.case_surveyor ?? '',
      case_delivery_or_service_incharge:
        row.case_delivery_or_service_incharge ?? '',
      case_delivery_or_service_incharge_id:
        (row as any).case_delivery_or_service_incharge_id ?? null,
      case_delivery_or_service_deadline: formatDateAsHyphen(
        row.case_delivery_or_service_deadline
      ),
      case_eta_cargo_ready_date: formatDateAsHyphen(
        row.case_eta_cargo_ready_date
      ),
      case_etb_cargo_departure_date: formatDateAsHyphen(
        row.case_etb_cargo_departure_date
      ),
      case_etd_cargo_delivery_date: formatDateAsHyphen(
        row.case_etd_cargo_delivery_date
      ),
      vessel_position: row.vessel_position ?? '',
      case_settlement_done: formatDateAsHyphen(row.case_settlement_done),
      case_personal_register_completed:
        row.case_personal_register_completed ?? '',
      case_business_register_completed:
        row.case_business_register_completed ?? '',
      case_e_filing_completed: row.case_e_filing_completed ?? '',
      case_paper_based_filing_completed:
        row.case_paper_based_filing_completed ?? '',
      case_epd: formatDateAsHyphen(row.case_epd),
      case_spd: formatDateAsHyphen(row.case_spd),
      case_incharge: row.case_incharge ?? '',
      case_memo_name: row.case_memo_name ?? '',
      case_memo_address: row.case_memo_address ?? '',
      case_inquiry_attachments: (row as any).case_inquiry_attachments ?? '',
      case_settlement_attachments:
        (row as any).case_settlement_attachments ?? '',
      case_remark: (row as any).case_remark ?? '',
      case_rank: row.case_rank ?? '',
    }),
    []
  )

  const didResetRef = useRef(false)
  useEffect(() => {
    if (!open) {
      memoNameEditedRef.current = false
      didResetRef.current = false
      setInquiryList([])
      setInquiryAttachments([])
      setSettlementAttachments([])
      localAddedInquiryIdsRef.current.clear()
      return
    }
    if (didResetRef.current) return
    didResetRef.current = true
    memoNameEditedRef.current = false
    form.reset(defaultValues)
    localAddedInquiryIdsRef.current.clear()
    if (isEdit && currentRow?.case_id) {
      fetchCaseInquiryListByCaseId(currentRow.case_id)
        .then((rows) => {
          setInquiryList(rows as CaseInquiry[])
        })
        .catch(() => {})
      const caseIdNum = Number(currentRow.case_id)
      if (Number.isFinite(caseIdNum) && caseIdNum > 0) {
        fetchCaseDetail(caseIdNum)
          .then((fullRow) => {
            if (fullRow) {
              const fullDefaults = buildFormValuesFromCase(fullRow)
              form.reset(fullDefaults)
              const atts = parseAttachments(
                (fullRow as any).case_inquiry_attachments
              )
              setInquiryAttachments(atts)
              try {
                form.setValue(
                  'case_inquiry_attachments',
                  atts.length > 0 ? JSON.stringify(atts) : '',
                  { shouldDirty: false, shouldValidate: false }
                )
              } catch {
                /* ignore */
              }
              const satts = parseAttachments(
                (fullRow as any).case_settlement_attachments
              )
              setSettlementAttachments(satts)
              try {
                form.setValue(
                  'case_settlement_attachments',
                  satts.length > 0 ? JSON.stringify(satts) : '',
                  { shouldDirty: false, shouldValidate: false }
                )
              } catch {
                /* ignore */
              }
            }
          })
          .catch(() => {})
      }
    } else {
      setInquiryAttachments([])
      setSettlementAttachments([])
    }
  }, [open, form, defaultValues, isEdit, currentRow, buildFormValuesFromCase])

  const initedAttachmentsRef = useRef(false)
  useEffect(() => {
    if (!open) {
      initedAttachmentsRef.current = false
      return
    }
    if (initedAttachmentsRef.current) return
    if (!isEdit) {
      initedAttachmentsRef.current = true
      return
    }
    const raw =
      (currentRow as any)?.case_inquiry_attachments ??
      form.getValues('case_inquiry_attachments') ??
      ''
    if (raw) {
      const atts = parseAttachments(raw)
      if (atts.length > 0) {
        setInquiryAttachments(atts)
        try {
          form.setValue('case_inquiry_attachments', JSON.stringify(atts), {
            shouldDirty: false,
            shouldValidate: false,
          })
        } catch {
          /* ignore */
        }
        initedAttachmentsRef.current = true
      }
    }
  }, [open, isEdit, currentRow, form, inquiryAttachments.length])

  const initedSettlementAttachmentsRef = useRef(false)
  useEffect(() => {
    if (!open) {
      initedSettlementAttachmentsRef.current = false
      return
    }
    if (initedSettlementAttachmentsRef.current) return
    if (!isEdit) {
      initedSettlementAttachmentsRef.current = true
      return
    }
    const raw =
      (currentRow as any)?.case_settlement_attachments ??
      form.getValues('case_settlement_attachments') ??
      ''
    if (raw) {
      const atts = parseAttachments(raw)
      if (atts.length > 0) {
        setSettlementAttachments(atts)
        try {
          form.setValue('case_settlement_attachments', JSON.stringify(atts), {
            shouldDirty: false,
            shouldValidate: false,
          })
        } catch {
          /* ignore */
        }
        initedSettlementAttachmentsRef.current = true
      }
    }
  }, [open, isEdit, currentRow, form, settlementAttachments.length])

  useEffect(() => {
    if (!open) return
    try {
      if (inquiryAttachments.length > 0) {
        form.setValue(
          'case_inquiry_attachments',
          JSON.stringify(inquiryAttachments),
          { shouldDirty: true, shouldValidate: false }
        )
      } else {
        form.setValue('case_inquiry_attachments', '', {
          shouldDirty: true,
          shouldValidate: false,
        })
      }
    } catch {
      /* ignore */
    }
  }, [inquiryAttachments, open, form])

  useEffect(() => {
    if (!open) return
    try {
      if (settlementAttachments.length > 0) {
        form.setValue(
          'case_settlement_attachments',
          JSON.stringify(settlementAttachments),
          { shouldDirty: true, shouldValidate: false }
        )
      } else {
        form.setValue('case_settlement_attachments', '', {
          shouldDirty: true,
          shouldValidate: false,
        })
      }
    } catch {
      /* ignore */
    }
  }, [settlementAttachments, open, form])

  useEffect(() => {
    if (!previewInquiryAtt || !isTextAttachment(previewInquiryAtt.name)) {
      setInquiryPreviewText(undefined)
      return
    }
    let cancelled = false
    setInquiryPreviewText(undefined)
    setInquiryPreviewTextLoading(true)
    readAttachmentTextContent(previewInquiryAtt)
      .then((txt) => {
        if (cancelled) return
        setInquiryPreviewText(txt)
      })
      .catch(() => {
        if (cancelled) return
        setInquiryPreviewText(null)
      })
      .finally(() => {
        if (cancelled) return
        setInquiryPreviewTextLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewInquiryAtt])

  useEffect(() => {
    if (!previewSettlementAtt || !isTextAttachment(previewSettlementAtt.name)) {
      setSettlementPreviewText(undefined)
      return
    }
    let cancelled = false
    setSettlementPreviewText(undefined)
    setSettlementPreviewTextLoading(true)
    readAttachmentTextContent(previewSettlementAtt)
      .then((txt) => {
        if (cancelled) return
        setSettlementPreviewText(txt)
      })
      .catch(() => {
        if (cancelled) return
        setSettlementPreviewText(null)
      })
      .finally(() => {
        if (cancelled) return
        setSettlementPreviewTextLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewSettlementAtt])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_urgent')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_urgent', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_should_handle_today')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_should_handle_today', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_personal_register_completed')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_personal_register_completed', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_business_register_completed')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_business_register_completed', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_e_filing_completed')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_e_filing_completed', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultUrgentBNoKey) return
    const cur = form.getValues('case_paper_based_filing_completed')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_paper_based_filing_completed', defaultUrgentBNoKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultUrgentBNoKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultProgressRInquiryKey) return
    const cur = form.getValues('case_progress')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_progress', defaultProgressRInquiryKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultProgressRInquiryKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!defaultInchargeEKey) return
    const cur = form.getValues('case_incharge')
    if (cur && String(cur).trim() !== '') return
    form.setValue('case_incharge', defaultInchargeEKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, isEdit, defaultInchargeEKey, form])

  useEffect(() => {
    if (!open) return
    if (isEdit) return
    if (!todayStr) return
    const curInq = form.getValues('case_inquiry_date')
    if (!curInq || String(curInq).trim() === '') {
      form.setValue('case_inquiry_date', todayStr, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }
    const curFollow = form.getValues('case_follow_date')
    if (!curFollow || String(curFollow).trim() === '') {
      form.setValue('case_follow_date', todayStr, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }
    const curUpd = form.getValues('case_uptodate_date')
    if (!curUpd || String(curUpd).trim() === '') {
      form.setValue('case_uptodate_date', todayStr, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }
  }, [open, isEdit, todayStr, form])

  const handleVesselPicked = useCallback(
    (r: VesselPickerResult) => {
      form.setValue('vessel_name', r.vessel_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearVessel = useCallback(() => {
    form.setValue('vessel_name', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleOwnerPicked = useCallback(
    (r: OwnerPickerResult) => {
      form.setValue('owner_following', r.owner_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
      form.setValue(
        'owner_following_id',
        r.owner_id != null ? String(r.owner_id) : '',
        {
          shouldDirty: true,
          shouldValidate: false,
        }
      )
    },
    [form]
  )

  const handleClearOwner = useCallback(() => {
    form.setValue('owner_following', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
    form.setValue('owner_following_id', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleSuperintendentPicked = useCallback(
    (r: SuperintendentPickerResult) => {
      form.setValue('case_superintendent', r.owner_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
      form.setValue(
        'case_superintendent_id',
        r.owner_id != null ? String(r.owner_id) : '',
        {
          shouldDirty: true,
          shouldValidate: false,
        }
      )
    },
    [form]
  )

  const handleClearSuperintendent = useCallback(() => {
    form.setValue('case_superintendent', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
    form.setValue('case_superintendent_id', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleAgentContactPicked = useCallback(
    (r: AgentContactPickerResult) => {
      form.setValue('case_agent', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearAgentContact = useCallback(() => {
    form.setValue('case_agent', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleShipyardContactPicked = useCallback(
    (r: ShipyardContactPickerResult) => {
      form.setValue('shipyard_business', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearShipyardContact = useCallback(() => {
    form.setValue('shipyard_business', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleSurveyorContactPicked = useCallback(
    (r: SurveyorContactPickerResult) => {
      form.setValue('case_surveyor', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearSurveyorContact = useCallback(() => {
    form.setValue('case_surveyor', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleServiceContactsPicked = useCallback(
    (r: CasesServiceContactMultiPickerResult) => {
      const idCsv =
        r.contact_ids && r.contact_ids.length > 0
          ? r.contact_ids.map(String).join(',')
          : ''
      const nameCn =
        r.contact_names && r.contact_names.length > 0
          ? r.contact_names.join('，')
          : ''
      form.setValue(
        'case_delivery_or_service_incharge_id',
        idCsv === '' ? null : idCsv,
        {
          shouldDirty: true,
          shouldValidate: false,
        }
      )
      form.setValue('case_delivery_or_service_incharge', nameCn, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearServiceContacts = useCallback(() => {
    form.setValue('case_delivery_or_service_incharge_id', null, {
      shouldDirty: true,
      shouldValidate: false,
    })
    form.setValue('case_delivery_or_service_incharge', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const inquiryForm = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema) as any,
    defaultValues: DEFAULT_INQUIRY_FORM_VALUES,
  })

  const inquirySupplierId = inquiryForm.watch('case_inquiry_division_id')
  const inquirySupplierName = useMemo(() => {
    return resolveSupplierNameById(inquirySupplierId)
  }, [inquirySupplierId, resolveSupplierNameById])

  const handleInquirySupplierPicked = useCallback(
    (r: SupplierPickerResult) => {
      const idNum = Number(r.supplier_id)
      inquiryForm.setValue(
        'case_inquiry_division_id',
        Number.isFinite(idNum) && idNum > 0 ? idNum : '',
        { shouldDirty: true, shouldValidate: false }
      )
    },
    [inquiryForm]
  )

  const handleClearInquirySupplier = useCallback(() => {
    inquiryForm.setValue('case_inquiry_division_id', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [inquiryForm])

  const handleAddInquirySubmit = useCallback(
    (values: InquiryFormValues) => {
      const divisionId =
        values.case_inquiry_division_id === '' ||
        values.case_inquiry_division_id == null
          ? null
          : Number(values.case_inquiry_division_id)
      const storedDate = normalizeDatetimeForStorage(values.case_inquired_date)
      const formattedDate = storedDate ? storedDate.slice(0, 16) : null
      if (inquiryEditingId != null) {
        setInquiryList((prev) =>
          prev.map((r) =>
            Number(r.inquiry_id) === Number(inquiryEditingId)
              ? {
                  ...r,
                  case_inquired_date: formattedDate,
                  case_inquiry_division_id:
                    divisionId && Number.isFinite(divisionId)
                      ? divisionId
                      : null,
                  case_inquiry_type: values.case_inquiry_type
                    ? String(values.case_inquiry_type)
                    : null,
                  remark: values.remark ? String(values.remark) : null,
                }
              : r
          )
        )
        toast.success('询价已更新')
      } else {
        const minId = inquiryList.reduce(
          (m, r) => Math.min(m, Number(r.inquiry_id) || 0),
          0
        )
        const nextId = Math.min(minId, 0) - 1
        const row: CaseInquiry = {
          inquiry_id: nextId,
          case_id: currentRow?.case_id ?? null,
          case_inquired_date: formattedDate,
          case_inquiry_division_id:
            divisionId && Number.isFinite(divisionId) ? divisionId : null,
          case_inquiry_type: values.case_inquiry_type
            ? String(values.case_inquiry_type)
            : null,
          remark: values.remark ? String(values.remark) : null,
        }
        localAddedInquiryIdsRef.current.add(nextId)
        setInquiryList((prev) => [...prev, row])
        toast.success('询价已添加')
      }
      inquiryForm.reset(DEFAULT_INQUIRY_FORM_VALUES)
      setInquiryEditingId(null)
      setInquiryDialogOpen(false)
    },
    [inquiryList, currentRow, inquiryForm, inquiryEditingId]
  )

  const handleStartEditInquiry = useCallback(
    (row: CaseInquiry) => {
      inquiryForm.reset({
        case_inquiry_division_id:
          row.case_inquiry_division_id != null &&
          Number.isFinite(Number(row.case_inquiry_division_id))
            ? Number(row.case_inquiry_division_id)
            : '',
        case_inquiry_type: row.case_inquiry_type ?? '',
        case_inquired_date: toDatetimeLocalValue(
          row.case_inquired_date
        ).replace('T', ' '),
        remark: row.remark ?? '',
      })
      setInquiryEditingId(row.inquiry_id)
      setInquiryDialogOpen(true)
    },
    [inquiryForm]
  )

  const createMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof createCase>[0]) => {
      const created = await createCase(payload)
      try {
        await replaceCaseInquiryByCaseId({
          case_id: Number(created.case_id),
          rows: inquiryList.map((r) => ({
            case_inquiry_division_id: r.case_inquiry_division_id ?? null,
            case_inquiry_type: r.case_inquiry_type ?? null,
            case_inquired_date: r.case_inquired_date
              ? normalizeDatetimeForStorage(r.case_inquired_date)
              : null,
            remark: r.remark ?? null,
          })),
        })
      } catch (e: any) {
        console.error('[case-inquiry-replace(create)]', e)
        toast.error(`询价记录保存失败: ${e.message || String(e)}`)
      }
      return created
    },
    onSuccess: () => {
      toast.success('案件创建成功')
      queryClient.invalidateQueries({ queryKey: ['case-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      queryClient.invalidateQueries({ queryKey: ['case-today-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-today-list-groups'] })
      queryClient.invalidateQueries({ queryKey: ['case-deal-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-deal-list-groups'] })
      form.reset()
      if (mode === 'page') {
        onSuccess?.()
      } else {
        onOpenChange?.(false)
      }
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message || String(err)}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Parameters<typeof updateCase>[1]
    }) => {
      const updated = await updateCase(id, data)
      try {
        await replaceCaseInquiryByCaseId({
          case_id: Number(id),
          rows: inquiryList.map((r) => ({
            case_inquiry_division_id: r.case_inquiry_division_id ?? null,
            case_inquiry_type: r.case_inquiry_type ?? null,
            case_inquired_date: r.case_inquired_date
              ? normalizeDatetimeForStorage(r.case_inquired_date)
              : null,
            remark: r.remark ?? null,
          })),
        })
      } catch (e: any) {
        console.error('[case-inquiry-replace(update)]', e)
        toast.error(`询价记录保存失败: ${e.message || String(e)}`)
      }
      return updated
    },
    onSuccess: () => {
      toast.success('案件更新成功')
      queryClient.invalidateQueries({ queryKey: ['case-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      queryClient.invalidateQueries({ queryKey: ['case-today-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-today-list-groups'] })
      queryClient.invalidateQueries({ queryKey: ['case-deal-list-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['case-deal-list-groups'] })
      form.reset()
      if (mode === 'page') {
        onSuccess?.()
      } else {
        onOpenChange?.(false)
      }
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message || String(err)}`)
    },
  })

  const handleInquiryAttachmentsPick = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const accepted: { f: File; a: CaseMemoAttachment }[] = []
      const rejected: string[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.size > MAX_ATTACHMENT_SIZE) {
          rejected.push(`${f.name}：超过 10MB`)
          continue
        }
        if (!filenameAllowedInquiry(f.name)) {
          rejected.push(`${f.name}：不支持该类型`)
          continue
        }
        const a: CaseMemoAttachment = {
          name: f.name,
          size: f.size,
          type: f.type || undefined,
        }
        accepted.push({ f, a })
      }
      if (accepted.length > 0) {
        const curTotal = inquiryAttachments.reduce(
          (s, x) => s + (x.size || 0),
          0
        )
        const addTotal = accepted.reduce((s, x) => s + (x.a.size || 0), 0)
        if (curTotal + addTotal > MAX_TOTAL_ATTACHMENT_SIZE) {
          const curMB = (curTotal / 1024 / 1024).toFixed(1)
          const addMB = (addTotal / 1024 / 1024).toFixed(1)
          const maxMB = (MAX_TOTAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(1)
          toast.error(
            `附件总量超限：当前已选 ${curMB}MB，本次新增 ${addMB}MB，上限 ${maxMB}MB`
          )
          return
        }
      }
      if (rejected.length > 0) {
        toast.warning(`以下文件未添加：${rejected.join('；')}`)
      }
      if (accepted.length === 0) return
      const toUpload = accepted.filter(
        ({ a }) => !inquiryAttachments.some((p) => p.name === a.name)
      )
      if (toUpload.length === 0) {
        if (accepted.length > 0) {
          toast.info('所选文件均已存在于附件列表中')
        }
        return
      }
      setInquiryUploadingCount((c) => c + toUpload.length)
      const results: CaseMemoAttachment[] = []
      const failed: string[] = []
      try {
        await Promise.all(
          toUpload.map(async ({ f, a }) => {
            try {
              const up = await uploadInquiryAttachmentToCos({
                file: f,
                vesselName: formVesselName,
                inquiryKeyword: formInquiryKeyword,
                inquiryDate: formInquiryDate,
              })
              results.push({
                ...a,
                data: up.url,
              })
            } catch (err: any) {
              failed.push(
                `${a.name}：${err?.message || String(err) || '上传失败'}`
              )
            }
          })
        )
      } catch {
        // ignore outer errors
      } finally {
        setInquiryUploadingCount((c) => Math.max(0, c - toUpload.length))
      }
      if (failed.length > 0) {
        toast.error(`以下文件上传失败：${failed.join('；')}`)
      }
      if (results.length > 0) {
        setInquiryAttachments((prev) => {
          const merged = [...prev]
          for (const a of results) {
            if (merged.some((p) => p.name === a.name)) continue
            merged.push(a)
          }
          return merged
        })
        toast.success(
          `成功上传 ${results.length} 个文件${
            toUpload.length > results.length
              ? `，${toUpload.length - results.length} 个失败`
              : ''
          }`
        )
      }
    },
    [inquiryAttachments, formVesselName, formInquiryKeyword, formInquiryDate]
  )

  const handleSettlementAttachmentsPick = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const accepted: CaseMemoAttachment[] = []
      const rejected: string[] = []
      const toRead: Array<{ f: File; a: CaseMemoAttachment }> = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.size > MAX_ATTACHMENT_SIZE) {
          rejected.push(`${f.name}：超过 10MB`)
          continue
        }
        if (!filenameAllowedInquiry(f.name)) {
          rejected.push(`${f.name}：不支持该类型`)
          continue
        }
        const a: CaseMemoAttachment = {
          name: f.name,
          size: f.size,
          type: f.type || undefined,
        }
        accepted.push(a)
        toRead.push({ f, a })
      }
      if (accepted.length > 0) {
        const curTotal = settlementAttachments.reduce(
          (s, x) => s + (x.size || 0),
          0
        )
        const addTotal = accepted.reduce((s, x) => s + (x.size || 0), 0)
        if (curTotal + addTotal > MAX_TOTAL_ATTACHMENT_SIZE) {
          const curMB = (curTotal / 1024 / 1024).toFixed(1)
          const addMB = (addTotal / 1024 / 1024).toFixed(1)
          const maxMB = (MAX_TOTAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(1)
          toast.error(
            `附件总量超限：当前已选 ${curMB}MB，本次新增 ${addMB}MB，上限 ${maxMB}MB`
          )
          return
        }
      }
      if (toRead.length > 0) {
        try {
          await Promise.all(
            toRead.map(async ({ f, a }) => {
              try {
                a.data = await readInquiryFileAsDataURL(f)
              } catch {
                // 读取失败则跳过 data 字段
              }
            })
          )
        } catch {
          // ignore
        }
      }
      if (rejected.length > 0) {
        toast.warning(`以下文件未添加：${rejected.join('；')}`)
      }
      if (accepted.length > 0) {
        setSettlementAttachments((prev) => {
          const merged = [...prev]
          for (const a of accepted) {
            if (merged.some((p) => p.name === a.name)) continue
            merged.push(a)
          }
          return merged
        })
      }
    },
    []
  )

  const onSubmit = useCallback(
    async (values: CaseForm) => {
      const keywordRaw = toOptStr(values.case_inquiry_keyword)
      if (!keywordRaw) {
        form.setError('case_inquiry_keyword', {
          type: 'manual',
          message: '需求编号/名称不能为空',
        })
        toast.error('需求编号/名称不能为空')
        return
      }
      if (!isEdit) {
        try {
          const dupResult = await runKeywordDuplicateCheck(keywordRaw)
          if (dupResult.exists) {
            const suffix = dupResult.matchedCaseId
              ? `（已存在于案件 #${dupResult.matchedCaseId}）`
              : ''
            form.setError('case_inquiry_keyword', {
              type: 'manual',
              message: `需求编号/名称已存在，不可重复${suffix}`,
            })
            toast.error(`需求编号/名称已存在，不可保存${suffix}`)
            return
          }
        } catch (e) {
          // ignore network errors and proceed without duplicate pre-check
        }
      }
      const payload = {
        vessel_name: toOptStr(values.vessel_name),
        invoice_number: toOptStr(values.invoice_number),
        order_number: toOptStr(values.order_number),
        case_inquiry_keyword: keywordRaw,
        case_progress: toOptStr(values.case_progress),
        case_urgent: toOptStr(values.case_urgent),
        case_inquiry_type: toOptStr(values.case_inquiry_type),
        case_inquiry_date: toOptStr(values.case_inquiry_date),
        case_follow_date: toOptStr(values.case_follow_date),
        case_uptodate_date: toOptStr(values.case_uptodate_date),
        case_should_handle_today: toOptStr(values.case_should_handle_today),
        owner_following: toOptStr(values.owner_following),
        owner_following_id:
          values.owner_following_id != null &&
          values.owner_following_id !== '' &&
          !Number.isNaN(Number(values.owner_following_id))
            ? Number(values.owner_following_id)
            : null,
        shipyard_business: toOptStr(values.shipyard_business),
        case_agent: toOptStr(values.case_agent),
        case_superintendent: toOptStr(values.case_superintendent),
        case_superintendent_id:
          values.case_superintendent_id != null &&
          values.case_superintendent_id !== '' &&
          !Number.isNaN(Number(values.case_superintendent_id))
            ? Number(values.case_superintendent_id)
            : null,
        case_surveyor: toOptStr(values.case_surveyor),
        case_delivery_or_service_incharge: toOptStr(
          values.case_delivery_or_service_incharge
        ),
        case_delivery_or_service_incharge_id: toOptStr(
          values.case_delivery_or_service_incharge_id != null
            ? String(values.case_delivery_or_service_incharge_id)
            : ''
        ),
        case_delivery_or_service_deadline: toOptStr(
          values.case_delivery_or_service_deadline
        ),
        case_eta_cargo_ready_date: toOptStr(values.case_eta_cargo_ready_date),
        case_etb_cargo_departure_date: toOptStr(
          values.case_etb_cargo_departure_date
        ),
        case_etd_cargo_delivery_date: toOptStr(
          values.case_etd_cargo_delivery_date
        ),
        vessel_position: toOptStr(values.vessel_position),
        case_settlement_done: toOptStr(values.case_settlement_done),
        case_personal_register_completed: toOptStr(
          values.case_personal_register_completed
        ),
        case_business_register_completed: toOptStr(
          values.case_business_register_completed
        ),
        case_e_filing_completed: toOptStr(values.case_e_filing_completed),
        case_paper_based_filing_completed: toOptStr(
          values.case_paper_based_filing_completed
        ),
        case_epd: toOptStr(values.case_epd),
        case_spd: toOptStr(values.case_spd),
        case_incharge: toOptStr(values.case_incharge),
        case_memo_name: toOptStr(values.case_memo_name),
        case_memo_address: toOptStr(values.case_memo_address),
        case_inquiry_attachments: stringifyAttachments(inquiryAttachments),
        case_settlement_attachments: stringifyAttachments(
          settlementAttachments
        ),
        case_remark: toOptStr(values.case_remark),
        case_rank: toOptStr(values.case_rank),
      } as any
      if (isEdit && currentRow) {
        updateMutation.mutate({ id: currentRow.case_id, data: payload })
      } else {
        createMutation.mutate(payload)
      }
    },
    [
      form,
      isEdit,
      currentRow,
      runKeywordDuplicateCheck,
      createMutation,
      updateMutation,
      inquiryAttachments,
      settlementAttachments,
    ]
  )

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleCancel = () => {
    form.reset()
    if (mode === 'page') {
      onCancel?.()
    } else {
      onOpenChange?.(false)
    }
  }

  const renderBody = () => (
    <>
      <div className='min-h-0 flex-1 overflow-y-auto py-1 pe-3'>
        <Form {...form}>
          <form
            id='cases-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid grid-cols-2 gap-4'
          >
            <FormField
              control={form.control}
              name='vessel_name'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    船名
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder='点击输入框从船队列表中选择...'
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setVesselPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setVesselPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                          {field.value ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearVessel()
                              }}
                              aria-label='清空船名'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          ) : null}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            aria-label='选择船只'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <Ship className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(vesselDisplay.flag ||
                      vesselDisplay.vesselClass ||
                      vesselDisplay.team ||
                      vesselDisplay.incharge) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {vesselDisplay.flag && (
                          <div>船旗：{vesselDisplay.flag}</div>
                        )}
                        {vesselDisplay.vesselClass && (
                          <div>船级：{vesselDisplay.vesselClass}</div>
                        )}
                        {vesselDisplay.team && (
                          <div>Team：{vesselDisplay.team}</div>
                        )}
                        {vesselDisplay.incharge && (
                          <div>负责人：{vesselDisplay.incharge}</div>
                        )}
                      </div>
                    )}
                    {field.value && !vesselDisplay.name && (
                      <p className='mt-1 text-xs text-muted-foreground/80'>
                        船名：{field.value}（未找到对应船只详情）
                      </p>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='invoice_number'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>发票号</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='请输入发票号'
                      className='col-span-4'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_inquiry_keyword'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    需求编号/名称
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='请输入需求编号/名称'
                      className='col-span-4'
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        form.clearErrors('case_inquiry_keyword')
                        keywordDuplicateCheckRef.current.lastCheckedNormalized =
                          ''
                      }}
                      onBlur={async (e) => {
                        field.onBlur?.()
                        await setKeywordErrorIfDuplicate(
                          e.currentTarget.value ?? ''
                        )
                      }}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='order_number'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    订单编号
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='请输入订单编号'
                      className='col-span-4'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_progress'
              render={({ field }) => {
                const rawVal = field.value ?? ''
                const displayLabel =
                  rawVal && rawVal.trim() !== ''
                    ? resolveProgressRLabel(rawVal)
                    : ''
                return (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-1 text-end'>
                      案件进度
                    </FormLabel>
                    <div className='col-span-4'>
                      <Popover
                        open={progressPopoverOpen}
                        onOpenChange={setProgressPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant='outline'
                              role='combobox'
                              aria-expanded={progressPopoverOpen}
                              className='w-full justify-between'
                            >
                              {displayLabel ? (
                                <span className='truncate'>{displayLabel}</span>
                              ) : (
                                <span className='text-muted-foreground'>
                                  请选择案件进度
                                </span>
                              )}
                              <div className='flex items-center gap-1'>
                                {displayLabel ? (
                                  <X
                                    className='h-4 w-4 shrink-0 opacity-50 hover:opacity-100'
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      field.onChange('')
                                    }}
                                  />
                                ) : null}
                                <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
                              </div>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                          <Command>
                            <CommandInput placeholder='搜索案件进度...' />
                            <CommandList>
                              <CommandEmpty>未找到匹配项</CommandEmpty>
                              <CommandGroup>
                                {progressROptions.map((o) => {
                                  const selected =
                                    rawVal &&
                                    rawVal.trim().toUpperCase() ===
                                      String(o.value).toUpperCase()
                                  return (
                                    <CommandItem
                                      key={o.value}
                                      value={`${o.label} ${o.value}`}
                                      onSelect={() => {
                                        field.onChange(o.value)
                                        queueMicrotask(() =>
                                          setProgressPopoverOpen(false)
                                        )
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          selected ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <span>{o.label}</span>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name='case_urgent'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    紧急案件
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_urgent_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_urgent_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_inquiry_type'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    需求类型
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {inqTypeAOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          inqTypeAOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_inquiry_type_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_inquiry_type_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_incharge'
              render={({ field }) => {
                const checkedArr: string[] = splitCsvKeys(field.value)
                return (
                  <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-1 text-end'>
                      案件负责人
                    </FormLabel>
                    <div className='col-span-4'>
                      <FormControl>
                        <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
                          {inchargeEOptions.length === 0 ? (
                            <div className='text-sm text-muted-foreground'>
                              -
                            </div>
                          ) : (
                            inchargeEOptions.map((o) => (
                              <div
                                key={o.value}
                                className='flex items-center gap-2'
                              >
                                <Checkbox
                                  id={`case_incharge_${o.value}`}
                                  checked={checkedArr.some(
                                    (k) =>
                                      k.toUpperCase() ===
                                      String(o.value).toUpperCase()
                                  )}
                                  onCheckedChange={(v) => {
                                    const next = new Set(
                                      checkedArr.map((s) =>
                                        String(s).toUpperCase()
                                      )
                                    )
                                    const keyU = String(o.value).toUpperCase()
                                    if (v) next.add(keyU)
                                    else next.delete(keyU)
                                    const nextStr = joinCsvKeys(
                                      Array.from(next)
                                    )
                                    field.onChange(nextStr)
                                  }}
                                />
                                <Label
                                  htmlFor={`case_incharge_${o.value}`}
                                  className='cursor-pointer font-normal select-none'
                                >
                                  {o.label}
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </FormControl>
                    </div>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name='case_rank'
              render={({ field }) => {
                const rawVal = field.value ?? ''
                const displayLabel =
                  rawVal && rawVal.trim() !== ''
                    ? resolveRankDLabel(rawVal)
                    : ''
                return (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-1 text-end'>
                      案件评级
                    </FormLabel>
                    <div className='col-span-4'>
                      <Popover
                        open={rankPopoverOpen}
                        onOpenChange={setRankPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant='outline'
                              role='combobox'
                              aria-expanded={rankPopoverOpen}
                              className='w-full justify-between'
                            >
                              {displayLabel ? (
                                <span className='truncate'>{displayLabel}</span>
                              ) : (
                                <span className='text-muted-foreground'>
                                  请选择案件评级
                                </span>
                              )}
                              <div className='flex items-center gap-1'>
                                {displayLabel ? (
                                  <X
                                    className='h-4 w-4 shrink-0 opacity-50 hover:opacity-100'
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      field.onChange('')
                                    }}
                                  />
                                ) : null}
                                <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
                              </div>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
                          <Command>
                            <CommandInput placeholder='搜索案件评级...' />
                            <CommandList>
                              <CommandEmpty>未找到匹配项</CommandEmpty>
                              <CommandGroup>
                                {rankDOptions.map((o) => {
                                  const selected =
                                    rawVal &&
                                    rawVal.trim().toUpperCase() ===
                                      String(o.value).toUpperCase()
                                  return (
                                    <CommandItem
                                      key={o.value}
                                      value={`${o.label} ${o.value}`}
                                      onSelect={() => {
                                        field.onChange(o.value)
                                        queueMicrotask(() =>
                                          setRankPopoverOpen(false)
                                        )
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          selected ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <span>{o.label}</span>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name='case_should_handle_today'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    当日需处理
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_should_handle_today_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_should_handle_today_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='owner_following'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    船东联络人
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder='点击从船东列表中选择...'
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setOwnerPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setOwnerPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                          {field.value ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearOwner()
                              }}
                              aria-label='清空船东联络人'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          ) : null}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            aria-label='选择船东联络人'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <User className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(ownerDisplay.email ||
                      ownerDisplay.phone ||
                      ownerDisplay.team ||
                      ownerDisplay.department ||
                      ownerDisplay.rank) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {ownerDisplay.email && (
                          <div>邮箱：{ownerDisplay.email}</div>
                        )}
                        {ownerDisplay.phone && (
                          <div>电话：{ownerDisplay.phone}</div>
                        )}
                        {ownerDisplay.team && (
                          <div>小组：{ownerDisplay.team}</div>
                        )}
                        {ownerDisplay.department && (
                          <div>部门：{ownerDisplay.department}</div>
                        )}
                        {ownerDisplay.rank && (
                          <div>职级：{ownerDisplay.rank}</div>
                        )}
                      </div>
                    )}
                    {field.value && !ownerDisplay.name && (
                      <p className='mt-1 text-xs text-muted-foreground/80'>
                        船东联络人：{field.value}（未找到对应船东）
                      </p>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_inquiry_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    询价日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_follow_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    开始日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_uptodate_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    跟进日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <div className='col-span-2'>
              <Card className='py-1.5'>
                <CardHeader className='pt-0 pb-1'>
                  <div className='flex items-center justify-between gap-3'>
                    <CardTitle className='text-base'>询价记录</CardTitle>
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => {
                        setInquiryEditingId(null)
                        inquiryForm.reset(DEFAULT_INQUIRY_FORM_VALUES)
                        setInquiryDialogOpen(true)
                      }}
                    >
                      <Plus className='mr-1 h-3.5 w-3.5' />
                      新增询价
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='pt-0 pb-0'>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-[calc(100%*8/24)]'>
                            单位名称
                          </TableHead>
                          <TableHead className='w-[calc(100%*8/24/3)] text-center'>
                            询价阶段
                          </TableHead>
                          <TableHead className='w-[calc(100%*8/24/3)] text-center'>
                            询价日期
                          </TableHead>
                          <TableHead className='w-[calc(100%*8/24)] text-center'>
                            备注
                          </TableHead>
                          <TableHead className='w-[calc(100%*8/24/3)] text-center'>
                            操作
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inquiryList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className='h-24 text-center text-muted-foreground'
                            >
                              <span className='text-sm'>暂无询价记录</span>
                            </TableCell>
                          </TableRow>
                        ) : (
                          inquiryList.map((row) => {
                            const supplierName = resolveSupplierNameById(
                              row.case_inquiry_division_id
                            )
                            const inqTypeLabel = resolveInquiryTypeQLabel(
                              row.case_inquiry_type
                            )
                            return (
                              <TableRow key={row.inquiry_id}>
                                <TableCell>{supplierName || '-'}</TableCell>
                                <TableCell className='text-center'>
                                  {inqTypeLabel ? (
                                    <Badge
                                      variant='outline'
                                      className={cn(
                                        getInquiryTypeQBadgeClass(inqTypeLabel)
                                      )}
                                    >
                                      {inqTypeLabel}
                                    </Badge>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell className='text-center font-mono text-xs whitespace-nowrap'>
                                  {row.case_inquired_date
                                    ? formatDateTimeMinute(
                                        row.case_inquired_date
                                      )
                                    : '-'}
                                </TableCell>
                                <TableCell className='max-w-[200px] truncate'>
                                  {row.remark || '-'}
                                </TableCell>
                                <TableCell className='text-center'>
                                  <div className='inline-flex items-center justify-center gap-1'>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      className='h-7 w-7'
                                      aria-label='编辑询价'
                                      onClick={() =>
                                        handleStartEditInquiry(row)
                                      }
                                    >
                                      <Pencil className='h-3.5 w-3.5' />
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      className='h-7 w-7 text-destructive/80 hover:text-destructive'
                                      aria-label='删除询价'
                                      onClick={() => {
                                        setInquiryList((prev) =>
                                          prev.filter(
                                            (r) =>
                                              Number(r.inquiry_id) !==
                                              Number(row.inquiry_id)
                                          )
                                        )
                                        localAddedInquiryIdsRef.current.delete(
                                          Number(row.inquiry_id)
                                        )
                                      }}
                                    >
                                      <X className='h-3.5 w-3.5' />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
            <FormField
              control={form.control}
              name='shipyard_business'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    船厂经营
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder='点击从船厂经营联系人列表中选择...'
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setShipyardContactPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setShipyardContactPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                          {field.value ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearShipyardContact()
                              }}
                              aria-label='清空船厂经营'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          ) : null}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            aria-label='选择船厂经营联系人'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <Briefcase className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(shipyardContactDisplay.mobile ||
                      shipyardContactDisplay.email ||
                      shipyardContactDisplay.rank ||
                      shipyardContactDisplay.division) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {shipyardContactDisplay.mobile && (
                          <div>手机：{shipyardContactDisplay.mobile}</div>
                        )}
                        {shipyardContactDisplay.email && (
                          <div>邮箱：{shipyardContactDisplay.email}</div>
                        )}
                        {shipyardContactDisplay.rank && (
                          <div>职级：{shipyardContactDisplay.rank}</div>
                        )}
                        {shipyardContactDisplay.division && (
                          <div>业务类型：{shipyardContactDisplay.division}</div>
                        )}
                      </div>
                    )}
                    {field.value && !shipyardContactDisplay.name && (
                      <p className='mt-1 text-xs text-muted-foreground/80'>
                        船厂经营：{field.value}（未找到对应联系人，类型J4）
                      </p>
                    )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_agent'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件代理
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder={`点击从案件代理（${agentContactTypeLabel}）列表中选择...`}
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setAgentContactPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setAgentContactPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                          {field.value ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearAgentContact()
                              }}
                              aria-label='清空案件代理'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          ) : null}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            onClick={() => setAgentContactPickerOpen(true)}
                            aria-label='选择案件代理'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <UserCheck className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(agentContactDisplay.mobile ||
                      agentContactDisplay.email ||
                      agentContactDisplay.rank ||
                      agentContactDisplay.division) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {agentContactDisplay.mobile && (
                          <div>手机：{agentContactDisplay.mobile}</div>
                        )}
                        {agentContactDisplay.email && (
                          <div>邮箱：{agentContactDisplay.email}</div>
                        )}
                        {agentContactDisplay.rank && (
                          <div>职级：{agentContactDisplay.rank}</div>
                        )}
                        {agentContactDisplay.division && (
                          <div>业务类型：{agentContactDisplay.division}</div>
                        )}
                      </div>
                    )}
                    {field.value &&
                      !agentContactDisplay.mobile &&
                      !agentContactDisplay.email &&
                      !agentContactDisplay.rank &&
                      !agentContactDisplay.division &&
                      agentContactDisplay.name && (
                        <p className='mt-1 text-xs text-muted-foreground/80'>
                          案件代理：{field.value}（未找到对应联系人，
                          {agentContactTypeLabel}）
                        </p>
                      )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_superintendent'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件机务
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder={`点击从案件机务（${superintendentDeptLabel}）列表中选择...`}
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setSuperintendentPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSuperintendentPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                          {field.value ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearSuperintendent()
                              }}
                              aria-label='清空案件机务'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          ) : null}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            onClick={() => setSuperintendentPickerOpen(true)}
                            aria-label='选择案件机务'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <Wrench className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(superintendentDisplay.email ||
                      superintendentDisplay.phone ||
                      superintendentDisplay.team ||
                      superintendentDisplay.department ||
                      superintendentDisplay.rank) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {superintendentDisplay.email && (
                          <div>邮箱：{superintendentDisplay.email}</div>
                        )}
                        {superintendentDisplay.phone && (
                          <div>电话：{superintendentDisplay.phone}</div>
                        )}
                        {superintendentDisplay.team && (
                          <div>小组：{superintendentDisplay.team}</div>
                        )}
                        {superintendentDisplay.department && (
                          <div>部门：{superintendentDisplay.department}</div>
                        )}
                        {superintendentDisplay.rank && (
                          <div>职级：{superintendentDisplay.rank}</div>
                        )}
                      </div>
                    )}
                    {field.value &&
                      !superintendentDisplay.email &&
                      !superintendentDisplay.phone &&
                      !superintendentDisplay.team &&
                      !superintendentDisplay.department &&
                      !superintendentDisplay.rank &&
                      superintendentDisplay.name && (
                        <p className='mt-1 text-xs text-muted-foreground/80'>
                          案件机务：{field.value}（未找到对应机务人员，
                          {superintendentDeptLabel}）
                        </p>
                      )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_surveyor'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件船检
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder={`点击从案件船检（${surveyorContactTypeLabel}）列表中选择...`}
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={field.value || ''}
                          onClick={() => setSurveyorContactPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSurveyorContactPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pe-2 pr-2'>
                          {field.value && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearSurveyorContact()
                              }}
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              aria-label='清空案件船检'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          )}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => setSurveyorContactPickerOpen(true)}
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            aria-label='选择案件船检'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <Compass className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {(surveyorContactDisplay.mobile ||
                      surveyorContactDisplay.email ||
                      surveyorContactDisplay.rank ||
                      surveyorContactDisplay.division) && (
                      <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                        {surveyorContactDisplay.mobile && (
                          <div>手机：{surveyorContactDisplay.mobile}</div>
                        )}
                        {surveyorContactDisplay.email && (
                          <div>邮箱：{surveyorContactDisplay.email}</div>
                        )}
                        {surveyorContactDisplay.rank && (
                          <div>职级：{surveyorContactDisplay.rank}</div>
                        )}
                        {surveyorContactDisplay.division && (
                          <div>业务类型：{surveyorContactDisplay.division}</div>
                        )}
                      </div>
                    )}
                    {field.value &&
                      !surveyorContactDisplay.mobile &&
                      !surveyorContactDisplay.email &&
                      !surveyorContactDisplay.rank &&
                      !surveyorContactDisplay.division &&
                      surveyorContactDisplay.name && (
                        <p className='mt-1 text-xs text-muted-foreground/80'>
                          案件船检：{field.value}
                          （未找到对应联系人，{surveyorContactTypeLabel}）
                        </p>
                      )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_delivery_or_service_incharge'
              render={({ field: _field }) => (
                <FormItem className='col-span-2 grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    承运人｜服务负责人
                  </FormLabel>
                  <div className='col-span-10'>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder='点击从联系人列表中选择服务负责人（可多选）...'
                          className='cursor-pointer pe-20 pr-20'
                          readOnly
                          value={serviceContactDisplay.rawNames || ''}
                          onClick={() => setServiceContactPickerOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setServiceContactPickerOpen(true)
                            }
                          }}
                        />
                        <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pe-2 pr-2'>
                          {(serviceContactDisplay.rawNames ||
                            formCaseServiceInchargeId) && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClearServiceContacts()
                              }}
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              aria-label='清空服务负责人'
                            >
                              <X className='h-3.5 w-3.5' />
                            </Button>
                          )}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => setServiceContactPickerOpen(true)}
                            className='pointer-events-auto h-7 w-7'
                            tabIndex={-1}
                            aria-label='选择服务负责人'
                          >
                            <Search className='h-3.5 w-3.5' />
                          </Button>
                          <Wrench className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                        </div>
                      </div>
                    </FormControl>
                    {serviceContactDisplay.count > 0 &&
                      (serviceContactDisplay.mobiles.length > 0 ||
                        serviceContactDisplay.emails.length > 0 ||
                        serviceContactDisplay.ranks.length > 0 ||
                        serviceContactDisplay.divisions.length > 0) && (
                        <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                          <div>共 {serviceContactDisplay.count} 位</div>
                          {serviceContactDisplay.mobiles.length > 0 && (
                            <div>
                              手机：
                              {serviceContactDisplay.mobiles.join('，')}
                            </div>
                          )}
                          {serviceContactDisplay.emails.length > 0 && (
                            <div>
                              邮箱：
                              {serviceContactDisplay.emails.join('，')}
                            </div>
                          )}
                          {serviceContactDisplay.ranks.length > 0 && (
                            <div>
                              职级：
                              {[...new Set(serviceContactDisplay.ranks)].join(
                                '，'
                              )}
                            </div>
                          )}
                          {serviceContactDisplay.divisions.length > 0 && (
                            <div>
                              类型：
                              {[
                                ...new Set(serviceContactDisplay.divisions),
                              ].join('，')}
                            </div>
                          )}
                        </div>
                      )}
                    {serviceContactDisplay.count === 0 &&
                      serviceContactDisplay.rawNames && (
                        <p className='mt-1 text-xs text-muted-foreground/80'>
                          服务负责人：
                          {serviceContactDisplay.rawNames}
                          （未在联系人库中找到匹配项，请手动补充或重新选择）
                        </p>
                      )}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_delivery_or_service_deadline'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    运输｜服务截止日
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_eta_cargo_ready_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    船舶到港 | 备货完成
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_etb_cargo_departure_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    船舶靠港 ｜ 货物发出
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_etd_cargo_delivery_date'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    船舶开航 ｜ 货物签收
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_epd'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    船东结账日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_spd'
              render={({ field }) => (
                <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    供应商结账日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='vessel_position'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    船舶位置
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {vesselPositionCOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          vesselPositionCOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`vessel_position_${o.value}`}
                              />
                              <Label
                                htmlFor={`vessel_position_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_settlement_done'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    案件结算完成日期
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <DatePicker
                        selected={parseDateOnly(field.value)}
                        onSelect={(d) => field.onChange(toISODateOnly(d))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_personal_register_completed'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    完成个人表登记
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_personal_register_completed_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_personal_register_completed_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_business_register_completed'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    完成经营表登记
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_business_register_completed_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_business_register_completed_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_e_filing_completed'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    已完成电子归档
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_e_filing_completed_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_e_filing_completed_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_paper_based_filing_completed'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-1 text-end'>
                    已完成纸质归档
                  </FormLabel>
                  <div className='col-span-4'>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        className='flex flex-wrap items-center gap-4'
                      >
                        {urgentBOptions.length === 0 ? (
                          <div className='text-sm text-muted-foreground'>-</div>
                        ) : (
                          urgentBOptions.map((o) => (
                            <div
                              key={o.value}
                              className='flex items-center gap-2'
                            >
                              <RadioGroupItem
                                value={o.value}
                                id={`case_paper_based_filing_completed_${o.value}`}
                              />
                              <Label
                                htmlFor={`case_paper_based_filing_completed_${o.value}`}
                                className='cursor-pointer font-normal select-none'
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))
                        )}
                      </RadioGroup>
                    </FormControl>
                  </div>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_memo_address'
              render={({ field }) => (
                <FormItem className='col-span-1 grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    案件备忘录地址
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='请输入案件备忘录地址'
                      className='col-span-4'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='col-span-4 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_memo_name'
              render={({ field }) => (
                <FormItem className='col-span-2 grid grid-cols-12 items-center space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 text-end'>
                    案件备忘录名称
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='由「船名」// 「需求名称」//「询价日期」生成，可手动修改'
                      className='col-span-10'
                      {...field}
                      onChange={(e) => {
                        memoNameEditedRef.current = true
                        field.onChange(e)
                      }}
                      onBlur={() => {
                        memoNameEditedRef.current = true
                        field.onBlur?.()
                      }}
                    />
                  </FormControl>
                  <FormMessage className='col-span-10 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_inquiry_attachments'
              render={({ field: _field }) => (
                <FormItem className='col-span-2 grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件需求文档
                  </FormLabel>
                  <div className='col-span-10 flex flex-col gap-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <input
                        ref={inquiryFileInputRef}
                        type='file'
                        multiple
                        className='hidden'
                        accept='.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,image/*,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                        onChange={(e) => {
                          void handleInquiryAttachmentsPick(e.target.files)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        variant='outline'
                        type='button'
                        onClick={() => inquiryFileInputRef.current?.click()}
                        className='h-10 gap-2 px-4'
                        disabled={inquiryUploadingCount > 0}
                      >
                        <PaperclipIcon size={16} />
                        <span>
                          {inquiryUploadingCount > 0
                            ? `上传中(${inquiryUploadingCount})...`
                            : '选择文件'}
                        </span>
                      </Button>
                      <p className='text-sm text-muted-foreground'>
                        支持 PDF / 图片 / Word / Excel / PPT / TXT / CSV
                        等，单文件 ≤ 10MB，合计 ≤ 12MB，可多选
                      </p>
                    </div>
                    {inquiryAttachments.length > 0 && (
                      <div className='flex flex-wrap gap-2 pt-1'>
                        {inquiryAttachments.map((a, idx) => (
                          <Badge
                            key={`${a.name}-${idx}`}
                            variant='secondary'
                            className='h-8 cursor-pointer gap-1 rounded-full px-3 py-0 text-xs font-normal transition-colors hover:bg-secondary/80'
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewInquiryAtt(a)
                            }}
                          >
                            <PaperclipIcon size={12} className='opacity-70' />
                            <span className='max-w-[16rem] truncate'>
                              {a.name}
                            </span>
                            {a.size != null && (
                              <span className='opacity-60'>
                                ({formatAttachmentSize(a.size)})
                              </span>
                            )}
                            <button
                              type='button'
                              aria-label={`移除附件 ${a.name}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setInquiryAttachments((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }}
                              className='ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-foreground/10'
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage className='col-span-10 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_settlement_attachments'
              render={({ field: _field }) => (
                <FormItem className='col-span-2 grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件结算文档
                  </FormLabel>
                  <div className='col-span-10 flex flex-col gap-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <input
                        ref={settlementFileInputRef}
                        type='file'
                        multiple
                        className='hidden'
                        accept='.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,image/*,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                        onChange={(e) => {
                          void handleSettlementAttachmentsPick(e.target.files)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        variant='outline'
                        type='button'
                        onClick={() => settlementFileInputRef.current?.click()}
                        className='h-10 gap-2 px-4'
                      >
                        <PaperclipIcon size={16} />
                        <span>选择文件</span>
                      </Button>
                      <p className='text-sm text-muted-foreground'>
                        支持 PDF / 图片 / Word / Excel / PPT / TXT / CSV
                        等，单文件 ≤ 10MB，合计 ≤ 12MB，可多选
                      </p>
                    </div>
                    {settlementAttachments.length > 0 && (
                      <div className='flex flex-wrap gap-2 pt-1'>
                        {settlementAttachments.map((a, idx) => (
                          <Badge
                            key={`${a.name}-${idx}`}
                            variant='secondary'
                            className='h-8 cursor-pointer gap-1 rounded-full px-3 py-0 text-xs font-normal transition-colors hover:bg-secondary/80'
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewSettlementAtt(a)
                            }}
                          >
                            <PaperclipIcon size={12} className='opacity-70' />
                            <span className='max-w-[16rem] truncate'>
                              {a.name}
                            </span>
                            {a.size != null && (
                              <span className='opacity-60'>
                                ({formatAttachmentSize(a.size)})
                              </span>
                            )}
                            <button
                              type='button'
                              aria-label={`移除附件 ${a.name}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSettlementAttachments((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }}
                              className='ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-foreground/10'
                            >
                              <X size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage className='col-span-10 col-start-3' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='case_remark'
              render={({ field }) => (
                <FormItem className='col-span-2 grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                  <FormLabel className='col-span-2 pt-2 text-end'>
                    案件备注
                  </FormLabel>
                  <div className='col-span-10'>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder='请输入案件备注...'
                      className='resize-y'
                    />
                  </div>
                  <FormMessage className='col-span-10 col-start-3' />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
      <div
        className={
          mode === 'page'
            ? '-mx-6 shrink-0 border-t bg-card px-6 py-4'
            : 'DialogFooter-cls mt-2 flex shrink-0 justify-end gap-2 pt-4'
        }
      >
        <div className={mode === 'page' ? 'flex justify-end gap-2' : ''}>
          <Button
            type='button'
            variant='outline'
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type='submit' form='cases-form' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {mode === 'page' ? (
        <Card className='mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden py-0 sm:max-w-5xl'>
          <CardHeader className='shrink-0 pt-6 text-start'>
            <CardTitle className='text-xl leading-none font-semibold tracking-tight'>
              {isEdit ? '编辑案件' : '添加新案件'}
            </CardTitle>
            <p className='mt-2 text-sm text-muted-foreground'>
              {isEdit ? '在此更新案件信息。' : '在此创建新案件。'}
              完成后点击保存。
            </p>
          </CardHeader>
          <CardContent className='flex min-h-0 flex-1 flex-col overflow-hidden p-0 px-6'>
            {renderBody()}
          </CardContent>
        </Card>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(state) => {
            if (!state) {
              form.reset()
            }
            onOpenChange?.(state)
          }}
        >
          <DialogContent className='flex h-[90vh] max-h-[90vh] flex-col overflow-hidden p-6 sm:max-w-5xl'>
            <DialogHeader className='shrink-0 text-start'>
              <DialogTitle>{isEdit ? '编辑案件' : '添加新案件'}</DialogTitle>
              <DialogDescription>
                {isEdit ? '在此更新案件信息。' : '在此创建新案件。'}
                完成后点击保存。
              </DialogDescription>
            </DialogHeader>
            {renderBody()}
          </DialogContent>
        </Dialog>
      )}

      <VesselPickerDialog
        open={vesselPickerOpen}
        onOpenChange={setVesselPickerOpen}
        initialSelectedName={form.getValues('vessel_name') || undefined}
        onSelect={handleVesselPicked}
      />

      <OwnerPickerDialog
        open={ownerPickerOpen}
        onOpenChange={setOwnerPickerOpen}
        initialSelectedId={form.getValues('owner_following_id') || null}
        initialSelectedName={form.getValues('owner_following') || undefined}
        onSelect={handleOwnerPicked}
      />

      <SuperintendentPickerDialog
        open={superintendentPickerOpen}
        onOpenChange={setSuperintendentPickerOpen}
        initialSelectedId={form.getValues('case_superintendent_id') || null}
        initialSelectedName={form.getValues('case_superintendent') || undefined}
        departmentLabel={superintendentDeptLabel}
        onSelect={handleSuperintendentPicked}
      />

      <AgentContactPickerDialog
        open={agentContactPickerOpen}
        onOpenChange={setAgentContactPickerOpen}
        initialSelectedName={form.getValues('case_agent') || undefined}
        onSelect={handleAgentContactPicked}
      />

      <ShipyardContactPickerDialog
        open={shipyardContactPickerOpen}
        onOpenChange={setShipyardContactPickerOpen}
        initialSelectedName={form.getValues('shipyard_business') || undefined}
        onSelect={handleShipyardContactPicked}
      />
      <SurveyorContactPickerDialog
        open={surveyorContactPickerOpen}
        onOpenChange={setSurveyorContactPickerOpen}
        initialSelectedName={form.getValues('case_surveyor') || undefined}
        onSelect={handleSurveyorContactPicked}
      />
      <CasesServiceContactMultiPickerDialog
        open={serviceContactPickerOpen}
        onOpenChange={setServiceContactPickerOpen}
        initialSelectedIds={resolveServiceContactInitialIds()}
        onSelect={handleServiceContactsPicked}
      />

      <SupplierPickerDialog
        open={inquirySupplierPickerOpen}
        onOpenChange={setInquirySupplierPickerOpen}
        initialSelectedId={
          inquiryForm.getValues('case_inquiry_division_id')
            ? String(inquiryForm.getValues('case_inquiry_division_id'))
            : undefined
        }
        onSelect={handleInquirySupplierPicked}
      />

      <Dialog
        open={inquiryDialogOpen}
        onOpenChange={(state) => {
          if (!state) {
            inquiryForm.reset(DEFAULT_INQUIRY_FORM_VALUES)
            setInquiryEditingId(null)
          }
          setInquiryDialogOpen(state)
        }}
      >
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              {inquiryEditingId != null ? '编辑询价' : '新增询价'}
            </DialogTitle>
            <DialogDescription>
              {inquiryEditingId != null
                ? '修改询价信息，点击「保存」即可更新到本对话的询价记录列表。'
                : '填写本次询价信息，完成后点击「添加」即可加入询价记录列表。'}
            </DialogDescription>
          </DialogHeader>
          <Form {...inquiryForm}>
            <form
              id='inquiry-add-form'
              onSubmit={inquiryForm.handleSubmit(handleAddInquirySubmit)}
              className='grid grid-cols-6 gap-4 py-2'
            >
              <FormField
                control={inquiryForm.control}
                name='case_inquiry_division_id'
                render={({ field: _field }) => (
                  <FormItem className='col-span-6 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-2 text-end'>
                      单位名称
                    </FormLabel>
                    <div className='col-span-4'>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            placeholder='点击输入框从供应商列表中选择...'
                            className='cursor-pointer pe-20 pr-20'
                            readOnly
                            value={inquirySupplierName || ''}
                            onClick={() => setInquirySupplierPickerOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setInquirySupplierPickerOpen(true)
                              }
                            }}
                          />
                          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                            {inquirySupplierName ? (
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='pointer-events-auto h-7 w-7'
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleClearInquirySupplier()
                                }}
                                aria-label='清空单位名称'
                              >
                                <X className='h-3.5 w-3.5' />
                              </Button>
                            ) : null}
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='pointer-events-auto h-7 w-7'
                              tabIndex={-1}
                              aria-label='选择供应商'
                            >
                              <Search className='h-3.5 w-3.5' />
                            </Button>
                            <Briefcase className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={inquiryForm.control}
                name='case_inquiry_type'
                render={({ field }) => (
                  <FormItem className='col-span-6 space-y-3'>
                    <div className='grid grid-cols-6 items-start gap-x-4'>
                      <FormLabel className='col-span-2 pt-2 text-end'>
                        询价阶段
                      </FormLabel>
                      <div className='col-span-4'>
                        <FormControl>
                          <RadioGroup
                            value={field.value ?? ''}
                            onValueChange={(v) => {
                              field.onChange(v)
                            }}
                            className='flex flex-wrap gap-x-6 gap-y-2 pt-1'
                          >
                            {inquiryTypeQOptions.length === 0 ? (
                              <div className='text-xs text-muted-foreground'>
                                暂无询价阶段字典配置（Q 前缀）
                              </div>
                            ) : (
                              inquiryTypeQOptions.map((o) => {
                                const checked =
                                  String(field.value ?? '').toUpperCase() ===
                                  String(o.value ?? '').toUpperCase()
                                return (
                                  <Label
                                    key={o.value}
                                    className={cn(
                                      'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors select-none',
                                      checked
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-input hover:border-primary/50 hover:bg-accent/30'
                                    )}
                                  >
                                    <RadioGroupItem
                                      value={o.value}
                                      id={`inq-type-q-${o.value}`}
                                      className='sr-only'
                                    />
                                    <span>{o.label || o.value}</span>
                                  </Label>
                                )
                              })
                            )}
                          </RadioGroup>
                        </FormControl>
                      </div>
                    </div>
                    <FormMessage className='block pl-[calc((100%+1rem)/3)]' />
                  </FormItem>
                )}
              />

              <FormField
                control={inquiryForm.control}
                name='case_inquired_date'
                render={({ field }) => (
                  <FormItem className='col-span-6 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-2 text-end'>
                      询价日期
                    </FormLabel>
                    <div className='col-span-4'>
                      <FormControl>
                        <DateTimePicker
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={inquiryForm.control}
                name='remark'
                render={({ field }) => (
                  <FormItem className='col-span-6 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 pt-2 text-end'>
                      备注
                    </FormLabel>
                    <div className='col-span-4'>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder='请输入备注...'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                inquiryForm.reset(DEFAULT_INQUIRY_FORM_VALUES)
                setInquiryEditingId(null)
                setInquiryDialogOpen(false)
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              form='inquiry-add-form'
              disabled={inquiryForm.formState.isSubmitting}
            >
              {inquiryEditingId != null ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewInquiryAtt !== null}
        onOpenChange={(s) => {
          if (!s) setPreviewInquiryAtt(null)
        }}
      >
        <DialogContent
          showCloseButton={true}
          className='flex h-[90vh] max-h-[90vh] w-[92vw] flex-col overflow-hidden p-0 sm:max-w-5xl'
        >
          {previewInquiryAtt && (
            <>
              <DialogHeader className='shrink-0 flex-row items-center justify-between gap-3 border-b px-6 py-4 text-start'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <DialogTitle className='flex flex-wrap items-center gap-2 text-base leading-6'>
                    {isImageAttachment(previewInquiryAtt.name) ? (
                      <ImageIcon size={18} className='text-primary' />
                    ) : (
                      <FileTextIcon size={18} className='text-primary' />
                    )}
                    <span className='break-all'>{previewInquiryAtt.name}</span>
                  </DialogTitle>
                  <DialogDescription className='text-xs'>
                    {previewInquiryAtt.size != null &&
                      formatAttachmentSize(previewInquiryAtt.size)}
                    {previewInquiryAtt.type && (
                      <>
                        <span className='mx-1.5 opacity-40'>·</span>
                        <span className='font-mono'>
                          {previewInquiryAtt.type}
                        </span>
                      </>
                    )}
                  </DialogDescription>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    type='button'
                    onClick={() => triggerAttachmentDownload(previewInquiryAtt)}
                    className='h-9 gap-1.5 px-3'
                  >
                    <DownloadIcon size={15} />
                    <span className='text-sm'>下载</span>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    type='button'
                    onClick={() => openAttachmentInNewTab(previewInquiryAtt)}
                    className='h-9 gap-1.5 px-3'
                  >
                    <ExternalLinkIcon size={15} />
                    <span className='text-sm'>新标签页打开</span>
                  </Button>
                  <DialogClose asChild>
                    <Button variant='ghost' size='sm' className='h-9 px-3'>
                      关闭
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>
              <ScrollArea className='min-h-0 flex-1'>
                <div className='flex min-h-full items-center justify-center p-6'>
                  {!previewInquiryAtt.data ? (
                    <Card className='w-full max-w-md'>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <FileTextIcon
                            size={18}
                            className='text-muted-foreground'
                          />
                          无预览内容
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          该附件为旧数据导入，未包含文件内容，无法在线预览。
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className='justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            triggerAttachmentDownload(previewInquiryAtt)
                          }
                        >
                          下载文件
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : isImageAttachment(previewInquiryAtt.name) ? (
                    <img
                      src={previewInquiryAtt.data}
                      alt={previewInquiryAtt.name}
                      className='max-w-full rounded-lg border shadow-sm'
                    />
                  ) : isTextAttachment(previewInquiryAtt.name) ? (
                    <div className='w-full max-w-4xl'>
                      {inquiryPreviewTextLoading ? (
                        <div className='flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground'>
                          <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle' />
                          正在加载文本内容...
                        </div>
                      ) : inquiryPreviewText === null ? (
                        <Card>
                          <CardHeader>
                            <CardTitle className='text-sm'>
                              文本加载失败
                            </CardTitle>
                            <CardDescription className='text-xs'>
                              无法加载该文本文件的内容，请下载后查看。
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className='justify-end'>
                            <Button
                              variant='outline'
                              size='sm'
                              type='button'
                              onClick={() =>
                                triggerAttachmentDownload(previewInquiryAtt)
                              }
                            >
                              下载文件
                            </Button>
                          </CardFooter>
                        </Card>
                      ) : (
                        <pre className='max-h-[70vh] overflow-auto rounded-lg border bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100'>
                          {inquiryPreviewText || '（空文件）'}
                        </pre>
                      )}
                    </div>
                  ) : isPdfAttachment(previewInquiryAtt.name) ? (
                    <iframe
                      src={previewInquiryAtt.data}
                      title={previewInquiryAtt.name}
                      className='h-[75vh] w-full rounded-lg border bg-white'
                    />
                  ) : (
                    <Card className='w-full max-w-md'>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <FileTextIcon
                            size={18}
                            className='text-muted-foreground'
                          />
                          不支持在线预览
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          该文件类型暂不支持在线预览，请下载后使用对应的软件打开。
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className='justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            triggerAttachmentDownload(previewInquiryAtt)
                          }
                        >
                          下载文件
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            openAttachmentInNewTab(previewInquiryAtt)
                          }
                        >
                          新标签页打开
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewSettlementAtt !== null}
        onOpenChange={(s) => {
          if (!s) setPreviewSettlementAtt(null)
        }}
      >
        <DialogContent
          showCloseButton={true}
          className='flex h-[90vh] max-h-[90vh] w-[92vw] flex-col overflow-hidden p-0 sm:max-w-5xl'
        >
          {previewSettlementAtt && (
            <>
              <DialogHeader className='shrink-0 flex-row items-center justify-between gap-3 border-b px-6 py-4 text-start'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <DialogTitle className='flex flex-wrap items-center gap-2 text-base leading-6'>
                    {isImageAttachment(previewSettlementAtt.name) ? (
                      <ImageIcon size={18} className='text-primary' />
                    ) : (
                      <FileTextIcon size={18} className='text-primary' />
                    )}
                    <span className='break-all'>
                      {previewSettlementAtt.name}
                    </span>
                  </DialogTitle>
                  <DialogDescription className='text-xs'>
                    {previewSettlementAtt.size != null &&
                      formatAttachmentSize(previewSettlementAtt.size)}
                    {previewSettlementAtt.type && (
                      <>
                        <span className='mx-1.5 opacity-40'>·</span>
                        <span className='font-mono'>
                          {previewSettlementAtt.type}
                        </span>
                      </>
                    )}
                  </DialogDescription>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    type='button'
                    onClick={() =>
                      triggerAttachmentDownload(previewSettlementAtt)
                    }
                    className='h-9 gap-1.5 px-3'
                  >
                    <DownloadIcon size={15} />
                    <span className='text-sm'>下载</span>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    type='button'
                    onClick={() => openAttachmentInNewTab(previewSettlementAtt)}
                    className='h-9 gap-1.5 px-3'
                  >
                    <ExternalLinkIcon size={15} />
                    <span className='text-sm'>新标签页打开</span>
                  </Button>
                  <DialogClose asChild>
                    <Button variant='ghost' size='sm' className='h-9 px-3'>
                      关闭
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>
              <ScrollArea className='min-h-0 flex-1'>
                <div className='flex min-h-full items-center justify-center p-6'>
                  {!previewSettlementAtt.data ? (
                    <Card className='w-full max-w-md'>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <FileTextIcon
                            size={18}
                            className='text-muted-foreground'
                          />
                          无预览内容
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          该附件为旧数据导入，未包含文件内容，无法在线预览。
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className='justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            triggerAttachmentDownload(previewSettlementAtt)
                          }
                        >
                          下载文件
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : isImageAttachment(previewSettlementAtt.name) ? (
                    <img
                      src={previewSettlementAtt.data}
                      alt={previewSettlementAtt.name}
                      className='max-w-full rounded-lg border shadow-sm'
                    />
                  ) : isTextAttachment(previewSettlementAtt.name) ? (
                    <div className='w-full max-w-4xl'>
                      {settlementPreviewTextLoading ? (
                        <div className='flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground'>
                          <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle' />
                          正在加载文本内容...
                        </div>
                      ) : settlementPreviewText === null ? (
                        <Card>
                          <CardHeader>
                            <CardTitle className='text-sm'>
                              文本加载失败
                            </CardTitle>
                            <CardDescription className='text-xs'>
                              无法加载该文本文件的内容，请下载后查看。
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className='justify-end'>
                            <Button
                              variant='outline'
                              size='sm'
                              type='button'
                              onClick={() =>
                                triggerAttachmentDownload(previewSettlementAtt)
                              }
                            >
                              下载文件
                            </Button>
                          </CardFooter>
                        </Card>
                      ) : (
                        <pre className='max-h-[70vh] overflow-auto rounded-lg border bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:bg-slate-900/40 dark:text-slate-100'>
                          {settlementPreviewText || '（空文件）'}
                        </pre>
                      )}
                    </div>
                  ) : isPdfAttachment(previewSettlementAtt.name) ? (
                    <iframe
                      src={previewSettlementAtt.data}
                      title={previewSettlementAtt.name}
                      className='h-[75vh] w-full rounded-lg border bg-white'
                    />
                  ) : (
                    <Card className='w-full max-w-md'>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-base'>
                          <FileTextIcon
                            size={18}
                            className='text-muted-foreground'
                          />
                          不支持在线预览
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          该文件类型暂不支持在线预览，请下载后使用对应的软件打开。
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className='justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            triggerAttachmentDownload(previewSettlementAtt)
                          }
                        >
                          下载文件
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          type='button'
                          onClick={() =>
                            openAttachmentInNewTab(previewSettlementAtt)
                          }
                        >
                          新标签页打开
                        </Button>
                      </CardFooter>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
