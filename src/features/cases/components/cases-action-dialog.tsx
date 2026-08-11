import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Search,
  X,
  Ship,
  UserRound,
  Factory,
  Briefcase,
  Cog,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchContactAll,
  fetchContactGroups,
  type Contact,
} from '@/features/contacts/api/client'
import {
  AgentPickerDialog,
  type AgentPickerResult,
} from '@/features/contacts/components/agent-picker-dialog'
import {
  ShipyardPickerDialog,
  type ShipyardPickerResult,
} from '@/features/contacts/components/shipyard-picker-dialog'
import {
  SurveyorPickerDialog,
  type SurveyorPickerResult,
} from '@/features/contacts/components/surveyor-picker-dialog'
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
  fetchVesselAll,
  fetchVesselGroups,
  type Vessel,
} from '@/features/users/api/client'
import {
  VesselPickerDialog,
  type VesselPickerResult,
} from '@/features/users/components/vessel-picker-dialog'
import { createCase, fetchCaseGroups, updateCase } from '../api/client'
import type { Case } from '../data/schema'

const zOptStr = z.string().optional().catch('')
const zOptDateStr = z.preprocess(
  (v) =>
    v instanceof Date
      ? v.toISOString().slice(0, 10)
      : v == null
        ? ''
        : String(v),
  z.string().optional().catch('')
)

const formSchema = z.object({
  vessel_name: zOptStr,
  invoice_number: zOptStr,
  order_number: zOptStr,
  case_inquiry_keyword: zOptStr,
  case_progress: zOptStr,
  case_urgent: zOptStr,
  case_inquiry_type: zOptStr,
  case_inquiry_date: zOptDateStr,
  case_follow_date: zOptDateStr,
  case_uptodate_date: zOptDateStr,
  case_should_handle_today: zOptStr,
  owner_following: zOptStr,
  shipyard_business: zOptStr,
  case_agent: zOptStr,
  case_superintendent: zOptStr,
  case_surveyor: zOptStr,
  case_delivery_or_service_incharge: zOptStr,
  case_delivery_or_service_deadline: zOptDateStr,
  case_eta_cargo_ready_date: zOptDateStr,
  case_etb_cargo_departure_date: zOptDateStr,
  case_etd_cargo_delivery_date: zOptDateStr,
  vessel_position: zOptStr,
  case_settlement_done: zOptDateStr,
  case_epd: zOptDateStr,
  case_spd: zOptDateStr,
  case_incharge: zOptStr,
  case_memo_name: zOptStr,
  case_memo_address: zOptStr,
  case_rank: zOptStr,
})
type CaseForm = z.infer<typeof formSchema>

function toOptStr(s: string | null | undefined): string | null {
  if (s == null || !s || s.trim() === '') return null
  return s
}

type CasesActionDialogProps = {
  currentRow?: Case
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CasesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: CasesActionDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!currentRow

  const { data: vesselRows = [] } = useQuery({
    queryKey: ['vessel-picker-all'],
    queryFn: fetchVesselAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: vesselGroupsData } = useQuery({
    queryKey: ['vessel-picker-groups'],
    queryFn: fetchVesselGroups,
    enabled: open,
    staleTime: 60000,
  })

  const { data: ownerRows = [] } = useQuery({
    queryKey: ['owner-picker-all'],
    queryFn: fetchOwnerAll,
    enabled: open,
    staleTime: 60000,
  })

  const { data: shipyardRows = [] } = useQuery({
    queryKey: ['shipyard-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
    select: useCallback((rows: Contact[]) => {
      return rows.filter((r) => {
        const t = String(r.contact_type ?? '').trim()
        return t.toUpperCase() === 'J4' || t === 'J4' || t.includes('J4')
      })
    }, []),
  })

  const { data: agentRows = [] } = useQuery({
    queryKey: ['agent-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
    select: useCallback((rows: Contact[]) => {
      return rows.filter((r) => {
        const t = String(r.contact_type ?? '').trim()
        return t.toUpperCase() === 'J1' || t === 'J1' || t.includes('J1')
      })
    }, []),
  })

  const { data: surveyorRows = [] } = useQuery({
    queryKey: ['surveyor-picker-all'],
    queryFn: fetchContactAll,
    enabled: open,
    staleTime: 60000,
    select: useCallback((rows: Contact[]) => {
      return rows.filter((r) => {
        const t = String(r.contact_type ?? '').trim()
        return t.toUpperCase() === 'J2' || t === 'J2' || t.includes('J2')
      })
    }, []),
  })

  const { data: superintendentRows = [] } = useQuery({
    queryKey: ['superintendent-picker-all'],
    queryFn: fetchOwnerAll,
    enabled: open,
    staleTime: 60000,
    select: useCallback((rows: Owner[]) => {
      return rows.filter((r) => {
        const t = String(r.owner_department ?? '').trim()
        return t.toUpperCase() === 'F1' || t === 'F1' || t.includes('F1')
      })
    }, []),
  })

  const { data: ownerGroupsData } = useQuery({
    queryKey: ['owner-picker-groups'],
    queryFn: fetchOwnerGroups,
    enabled: open,
    staleTime: 60000,
  })

  const { data: contactGroupsData } = useQuery({
    queryKey: ['contact-picker-groups'],
    queryFn: fetchContactGroups,
    enabled: open,
    staleTime: 60000,
  })

  const [vesselPickerOpen, setVesselPickerOpen] = useState(false)
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)
  const [shipyardPickerOpen, setShipyardPickerOpen] = useState(false)
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [superintendentPickerOpen, setSuperintendentPickerOpen] =
    useState(false)
  const [surveyorPickerOpen, setSurveyorPickerOpen] = useState(false)

  const vesselNameMap = useMemo(() => {
    const map = new Map<string, Vessel>()
    for (const v of vesselRows as Vessel[]) {
      if (v.vessel_name) map.set(String(v.vessel_name), v)
    }
    return map
  }, [vesselRows])

  const ownerNameMap = useMemo(() => {
    const map = new Map<string, Owner>()
    for (const v of ownerRows as Owner[]) {
      if (v.owner_name) map.set(String(v.owner_name), v)
    }
    return map
  }, [ownerRows])

  const shipyardNameMap = useMemo(() => {
    const map = new Map<string, Contact>()
    for (const v of shipyardRows as Contact[]) {
      if (v.contact_name) map.set(String(v.contact_name), v)
    }
    return map
  }, [shipyardRows])

  const agentNameMap = useMemo(() => {
    const map = new Map<string, Contact>()
    for (const v of agentRows as Contact[]) {
      if (v.contact_name) map.set(String(v.contact_name), v)
    }
    return map
  }, [agentRows])

  const superintendentNameMap = useMemo(() => {
    const map = new Map<string, Owner>()
    for (const v of superintendentRows as Owner[]) {
      if (v.owner_name) map.set(String(v.owner_name), v)
    }
    return map
  }, [superintendentRows])

  const surveyorNameMap = useMemo(() => {
    const map = new Map<string, Contact>()
    for (const v of surveyorRows as Contact[]) {
      if (v.contact_name) map.set(String(v.contact_name), v)
    }
    return map
  }, [surveyorRows])

  const { data: caseGroupsData } = useQuery({
    queryKey: ['case-list-groups'],
    queryFn: fetchCaseGroups,
    staleTime: 60000,
    enabled: open,
  })

  const progressOptions = useMemo(() => {
    return (caseGroupsData?.progressDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.progressDict])

  const urgentOptions = useMemo(() => {
    const opts = (caseGroupsData?.urgentDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
    const hasNo = opts.some((o) => o.value.toUpperCase() === 'NO')
    if (!hasNo && opts.length === 0) {
      opts.unshift({ key: 'NO', value: 'NO' })
    }
    return opts
  }, [caseGroupsData?.urgentDict])

  const defaultUrgentKey = useMemo(() => {
    const noOpt = urgentOptions.find((o) => o.value.toUpperCase() === 'NO')
    return noOpt?.key ?? urgentOptions[0]?.key ?? ''
  }, [urgentOptions])

  const inquiryTypeOptions = useMemo(() => {
    return (caseGroupsData?.inquiryTypeDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.inquiryTypeDict])

  const resolveInquiryTypeLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = inquiryTypeOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [inquiryTypeOptions]
  )

  const positionOptions = useMemo(() => {
    return (caseGroupsData?.vesselPositionDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.vesselPositionDict])

  const resolvePositionLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = positionOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [positionOptions]
  )

  const inchargeOptions = useMemo(() => {
    return (caseGroupsData?.inchargeDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.inchargeDict])

  const splitCsvKeys = useCallback((raw: unknown): string[] => {
    if (raw === null || raw === undefined || raw === '') return []
    return String(raw)
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }, [])

  const joinCsvKeys = useCallback((keys: string[]): string => {
    return keys.filter((k) => k && k.trim()).join(',')
  }, [])

  const rankOptions = useMemo(() => {
    return (caseGroupsData?.rankDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
  }, [caseGroupsData?.rankDict])

  const resolveRankLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = rankOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [rankOptions]
  )

  const handleTodayOptions = useMemo(() => {
    const opts = (caseGroupsData?.handleTodayDict ?? [])
      .map((d) => ({
        key: String(d.dict_key ?? ''),
        value: String(d.dict_value ?? ''),
      }))
      .filter((o) => o.key && o.value)
    if (
      !opts.some((o) => o.value.toUpperCase() === 'NO') &&
      opts.length === 0
    ) {
      opts.unshift({ key: 'NO', value: 'NO' })
    }
    return opts
  }, [caseGroupsData?.handleTodayDict])

  const defaultHandleTodayKey = useMemo(() => {
    const noOpt = handleTodayOptions.find((o) => o.value.toUpperCase() === 'NO')
    return noOpt?.key ?? handleTodayOptions[0]?.key ?? ''
  }, [handleTodayOptions])

  const resolveUrgentLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = urgentOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [urgentOptions]
  )

  const resolveProgressLabel = useCallback(
    (raw: unknown): string => {
      if (raw === null || raw === undefined || raw === '') return ''
      const p = String(raw).trim()
      if (!p) return ''
      const hit = progressOptions.find(
        (o) => o.key.toUpperCase() === p.toUpperCase()
      )
      if (hit) return hit.value
      return p
    },
    [progressOptions]
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

  const ownerTeamKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of ownerGroupsData?.teamDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [ownerGroupsData?.teamDict])

  const ownerDeptKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of ownerGroupsData?.departmentDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [ownerGroupsData?.departmentDict])

  const ownerRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of ownerGroupsData?.rankDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [ownerGroupsData?.rankDict])

  const contactTypeKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of contactGroupsData?.typeDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [contactGroupsData?.typeDict])

  const contactRankKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of contactGroupsData?.rankDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [contactGroupsData?.rankDict])

  const contactDivisionKeyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of contactGroupsData?.divisionDict ?? []) {
      m.set(String(d.dict_key).toUpperCase(), String(d.dict_value ?? ''))
    }
    return m
  }, [contactGroupsData?.divisionDict])

  const resolveDictLabel = (map: Map<string, string>, raw: unknown): string => {
    if (raw === null || raw === undefined || raw === '') return ''
    const p = String(raw).trim()
    if (!p) return ''
    const byKey = map.get(p.toUpperCase())
    if (byKey) return byKey
    return p
  }

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

  const resolveOwnerDisplay = useCallback(
    (
      ownerName: string | null | undefined
    ): {
      name: string
      phone: string
      email: string
      team: string
      department: string
      rank: string
    } => {
      const name = ownerName ?? ''
      if (!name)
        return {
          name: '',
          phone: '',
          email: '',
          team: '',
          department: '',
          rank: '',
        }
      const v = ownerNameMap.get(name)
      if (v) {
        return {
          name: v.owner_name ?? '',
          phone: v.owner_phone ?? '',
          email: v.owner_email ?? '',
          team: resolveDictLabel(ownerTeamKeyMap, v.owner_team),
          department: resolveDictLabel(ownerDeptKeyMap, v.owner_department),
          rank: resolveDictLabel(ownerRankKeyMap, v.owner_rank),
        }
      }
      return {
        name,
        phone: '',
        email: '',
        team: '',
        department: '',
        rank: '',
      }
    },
    [ownerNameMap, ownerTeamKeyMap, ownerDeptKeyMap, ownerRankKeyMap]
  )

  const resolveShipyardDisplay = useCallback(
    (
      contactName: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      type: string
      rank: string
      division: string
      remark: string
    } => {
      const name = contactName ?? ''
      if (!name)
        return {
          name: '',
          mobile: '',
          email: '',
          type: '',
          rank: '',
          division: '',
          remark: '',
        }
      const v = shipyardNameMap.get(name)
      if (v) {
        return {
          name: v.contact_name ?? '',
          mobile: v.contact_mobile ?? '',
          email: v.contact_email ?? '',
          type: resolveDictLabel(contactTypeKeyMap, v.contact_type),
          rank: resolveDictLabel(contactRankKeyMap, v.contact_rank),
          division: resolveDictLabel(
            contactDivisionKeyMap,
            v.contact_division_type
          ),
          remark: v.contact_remark ?? '',
        }
      }
      return {
        name,
        mobile: '',
        email: '',
        type: '',
        rank: '',
        division: '',
        remark: '',
      }
    },
    [
      shipyardNameMap,
      contactTypeKeyMap,
      contactRankKeyMap,
      contactDivisionKeyMap,
    ]
  )

  const resolveAgentDisplay = useCallback(
    (
      contactName: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      type: string
      rank: string
      division: string
      remark: string
    } => {
      const name = contactName ?? ''
      if (!name)
        return {
          name: '',
          mobile: '',
          email: '',
          type: '',
          rank: '',
          division: '',
          remark: '',
        }
      const v = agentNameMap.get(name)
      if (v) {
        return {
          name: v.contact_name ?? '',
          mobile: v.contact_mobile ?? '',
          email: v.contact_email ?? '',
          type: resolveDictLabel(contactTypeKeyMap, v.contact_type),
          rank: resolveDictLabel(contactRankKeyMap, v.contact_rank),
          division: resolveDictLabel(
            contactDivisionKeyMap,
            v.contact_division_type
          ),
          remark: v.contact_remark ?? '',
        }
      }
      return {
        name,
        mobile: '',
        email: '',
        type: '',
        rank: '',
        division: '',
        remark: '',
      }
    },
    [agentNameMap, contactTypeKeyMap, contactRankKeyMap, contactDivisionKeyMap]
  )

  const resolveSuperintendentDisplay = useCallback(
    (
      ownerName: string | null | undefined
    ): {
      name: string
      phone: string
      email: string
      team: string
      department: string
      rank: string
    } => {
      const name = ownerName ?? ''
      if (!name)
        return {
          name: '',
          phone: '',
          email: '',
          team: '',
          department: '',
          rank: '',
        }
      const v = superintendentNameMap.get(name)
      if (v) {
        return {
          name: v.owner_name ?? '',
          phone: v.owner_phone ?? '',
          email: v.owner_email ?? '',
          team: resolveDictLabel(ownerTeamKeyMap, v.owner_team),
          department: resolveDictLabel(ownerDeptKeyMap, v.owner_department),
          rank: resolveDictLabel(ownerRankKeyMap, v.owner_rank),
        }
      }
      return {
        name,
        phone: '',
        email: '',
        team: '',
        department: '',
        rank: '',
      }
    },
    [superintendentNameMap, ownerTeamKeyMap, ownerDeptKeyMap, ownerRankKeyMap]
  )

  const resolveSurveyorDisplay = useCallback(
    (
      contactName: string | null | undefined
    ): {
      name: string
      mobile: string
      email: string
      type: string
      rank: string
      division: string
      remark: string
    } => {
      const name = contactName ?? ''
      if (!name)
        return {
          name: '',
          mobile: '',
          email: '',
          type: '',
          rank: '',
          division: '',
          remark: '',
        }
      const v = surveyorNameMap.get(name)
      if (v) {
        return {
          name: v.contact_name ?? '',
          mobile: v.contact_mobile ?? '',
          email: v.contact_email ?? '',
          type: resolveDictLabel(contactTypeKeyMap, v.contact_type),
          rank: resolveDictLabel(contactRankKeyMap, v.contact_rank),
          division: resolveDictLabel(
            contactDivisionKeyMap,
            v.contact_division_type
          ),
          remark: v.contact_remark ?? '',
        }
      }
      return {
        name,
        mobile: '',
        email: '',
        type: '',
        rank: '',
        division: '',
        remark: '',
      }
    },
    [
      surveyorNameMap,
      contactTypeKeyMap,
      contactRankKeyMap,
      contactDivisionKeyMap,
    ]
  )

  const defaultValues = isEdit
    ? {
        vessel_name: currentRow.vessel_name ?? '',
        invoice_number: currentRow.invoice_number ?? '',
        order_number: currentRow.order_number ?? '',
        case_inquiry_keyword: currentRow.case_inquiry_keyword ?? '',
        case_progress: currentRow.case_progress ?? '',
        case_urgent: currentRow.case_urgent ?? defaultUrgentKey,
        case_inquiry_type: currentRow.case_inquiry_type ?? '',
        case_inquiry_date: currentRow.case_inquiry_date ?? '',
        case_follow_date: currentRow.case_follow_date ?? '',
        case_uptodate_date: currentRow.case_uptodate_date ?? '',
        case_should_handle_today:
          currentRow.case_should_handle_today ?? defaultHandleTodayKey,
        owner_following: currentRow.owner_following ?? '',
        shipyard_business: currentRow.shipyard_business ?? '',
        case_agent: currentRow.case_agent ?? '',
        case_superintendent: currentRow.case_superintendent ?? '',
        case_surveyor: currentRow.case_surveyor ?? '',
        case_delivery_or_service_incharge:
          currentRow.case_delivery_or_service_incharge ?? '',
        case_delivery_or_service_deadline:
          currentRow.case_delivery_or_service_deadline ?? '',
        case_eta_cargo_ready_date: currentRow.case_eta_cargo_ready_date ?? '',
        case_etb_cargo_departure_date:
          currentRow.case_etb_cargo_departure_date ?? '',
        case_etd_cargo_delivery_date:
          currentRow.case_etd_cargo_delivery_date ?? '',
        vessel_position: currentRow.vessel_position ?? '',
        case_settlement_done: currentRow.case_settlement_done ?? '',
        case_epd: currentRow.case_epd ?? '',
        case_spd: currentRow.case_spd ?? '',
        case_incharge: currentRow.case_incharge ?? '',
        case_memo_name: currentRow.case_memo_name ?? '',
        case_memo_address: currentRow.case_memo_address ?? '',
        case_rank: currentRow.case_rank ?? '',
      }
    : {
        vessel_name: '',
        invoice_number: '',
        order_number: '',
        case_inquiry_keyword: '',
        case_progress: '',
        case_urgent: defaultUrgentKey,
        case_inquiry_type: '',
        case_inquiry_date: '',
        case_follow_date: '',
        case_uptodate_date: '',
        case_should_handle_today: defaultHandleTodayKey,
        owner_following: '',
        shipyard_business: '',
        case_agent: '',
        case_superintendent: '',
        case_surveyor: '',
        case_delivery_or_service_incharge: '',
        case_delivery_or_service_deadline: '',
        case_eta_cargo_ready_date: '',
        case_etb_cargo_departure_date: '',
        case_etd_cargo_delivery_date: '',
        vessel_position: '',
        case_settlement_done: '',
        case_epd: '',
        case_spd: '',
        case_incharge: '',
        case_memo_name: '',
        case_memo_address: '',
        case_rank: '',
      }

  const form = useForm<CaseForm>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const formVesselName = form.watch('vessel_name')
  const formInquiryKeyword = form.watch('case_inquiry_keyword')
  const formInquiryDate = form.watch('case_inquiry_date')
  const formOwnerFollowing = form.watch('owner_following')
  const formShipyardBusiness = form.watch('shipyard_business')
  const formCaseAgent = form.watch('case_agent')
  const formCaseSuperintendent = form.watch('case_superintendent')
  const formCaseSurveyor = form.watch('case_surveyor')

  const vesselDisplay = useMemo(() => {
    return resolveVesselDisplay(formVesselName ?? '')
  }, [formVesselName, resolveVesselDisplay])

  const ownerDisplay = useMemo(() => {
    return resolveOwnerDisplay(formOwnerFollowing ?? '')
  }, [formOwnerFollowing, resolveOwnerDisplay])

  const shipyardDisplay = useMemo(() => {
    return resolveShipyardDisplay(formShipyardBusiness ?? '')
  }, [formShipyardBusiness, resolveShipyardDisplay])

  const agentDisplay = useMemo(() => {
    return resolveAgentDisplay(formCaseAgent ?? '')
  }, [formCaseAgent, resolveAgentDisplay])

  const superintendentDisplay = useMemo(() => {
    return resolveSuperintendentDisplay(formCaseSuperintendent ?? '')
  }, [formCaseSuperintendent, resolveSuperintendentDisplay])

  const surveyorDisplay = useMemo(() => {
    return resolveSurveyorDisplay(formCaseSurveyor ?? '')
  }, [formCaseSurveyor, resolveSurveyorDisplay])

  useEffect(() => {
    const parts = [
      formVesselName ?? '',
      formInquiryKeyword ?? '',
      formInquiryDate ?? '',
    ].filter((p) => p && p.trim().length > 0)
    const memoName = parts.join(' / ')
    form.setValue('case_memo_name', memoName, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form, formVesselName, formInquiryKeyword, formInquiryDate])

  const didResetRef = useRef(false)
  useEffect(() => {
    if (!open) {
      didResetRef.current = false
      return
    }
    if (didResetRef.current) return
    didResetRef.current = true
    form.reset(defaultValues)
  }, [open, form, defaultValues])

  useEffect(() => {
    if (open || didResetRef.current) return
    didResetRef.current = false
  }, [open])

  useEffect(() => {
    if (!open || isEdit) return
    if (!defaultUrgentKey) return
    const current = form.getValues('case_urgent')
    const validKeys = new Set(urgentOptions.map((o) => o.key))
    if (current && validKeys.has(current)) return
    form.setValue('case_urgent', defaultUrgentKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [defaultUrgentKey, open, isEdit, urgentOptions, form])

  useEffect(() => {
    if (!open || isEdit) return
    if (!defaultHandleTodayKey) return
    const current = form.getValues('case_should_handle_today')
    const validKeys = new Set(handleTodayOptions.map((o) => o.key))
    if (current && validKeys.has(current)) return
    form.setValue('case_should_handle_today', defaultHandleTodayKey, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [defaultHandleTodayKey, open, isEdit, handleTodayOptions, form])

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
    },
    [form]
  )

  const handleClearOwner = useCallback(() => {
    form.setValue('owner_following', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleShipyardPicked = useCallback(
    (r: ShipyardPickerResult) => {
      form.setValue('shipyard_business', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearShipyard = useCallback(() => {
    form.setValue('shipyard_business', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleAgentPicked = useCallback(
    (r: AgentPickerResult) => {
      form.setValue('case_agent', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearAgent = useCallback(() => {
    form.setValue('case_agent', '', {
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
    },
    [form]
  )

  const handleClearSuperintendent = useCallback(() => {
    form.setValue('case_superintendent', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const handleSurveyorPicked = useCallback(
    (r: SurveyorPickerResult) => {
      form.setValue('case_surveyor', r.contact_name, {
        shouldDirty: true,
        shouldValidate: false,
      })
    },
    [form]
  )

  const handleClearSurveyor = useCallback(() => {
    form.setValue('case_surveyor', '', {
      shouldDirty: true,
      shouldValidate: false,
    })
  }, [form])

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      toast.success('案件创建成功')
      queryClient.invalidateQueries({ queryKey: ['case-list'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`创建失败: ${err.message || String(err)}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Parameters<typeof updateCase>[1]
    }) => updateCase(id, data),
    onSuccess: () => {
      toast.success('案件更新成功')
      queryClient.invalidateQueries({ queryKey: ['case-list'] })
      queryClient.invalidateQueries({ queryKey: ['case-list-groups'] })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(`更新失败: ${err.message || String(err)}`)
    },
  })

  const onSubmit = (values: CaseForm) => {
    const payload = {
      vessel_name: toOptStr(values.vessel_name),
      invoice_number: toOptStr(values.invoice_number),
      order_number: toOptStr(values.order_number),
      case_inquiry_keyword: toOptStr(values.case_inquiry_keyword),
      case_progress: toOptStr(values.case_progress),
      case_urgent: toOptStr(values.case_urgent),
      case_inquiry_type: toOptStr(values.case_inquiry_type),
      case_inquiry_date: toOptStr(values.case_inquiry_date),
      case_follow_date: toOptStr(values.case_follow_date),
      case_uptodate_date: toOptStr(values.case_uptodate_date),
      case_should_handle_today: toOptStr(values.case_should_handle_today),
      owner_following: toOptStr(values.owner_following),
      shipyard_business: toOptStr(values.shipyard_business),
      case_agent: toOptStr(values.case_agent),
      case_superintendent: toOptStr(values.case_superintendent),
      case_surveyor: toOptStr(values.case_surveyor),
      case_delivery_or_service_incharge: toOptStr(
        values.case_delivery_or_service_incharge
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
      case_epd: toOptStr(values.case_epd),
      case_spd: toOptStr(values.case_spd),
      case_incharge: toOptStr(values.case_incharge),
      case_memo_name: toOptStr(values.case_memo_name),
      case_memo_address: toOptStr(values.case_memo_address),
      case_rank: toOptStr(values.case_rank),
    } as any
    if (isEdit && currentRow) {
      updateMutation.mutate({ id: currentRow.case_id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (!state) {
            form.reset()
          }
          onOpenChange(state)
        }}
      >
        <DialogContent className='sm:max-w-5xl'>
          <DialogHeader className='text-start'>
            <DialogTitle>{isEdit ? '编辑案件' : '添加新案件'}</DialogTitle>
            <DialogDescription>
              {isEdit ? '在此更新案件信息。' : '在此创建新案件。'}
              完成后点击保存。
            </DialogDescription>
          </DialogHeader>
          <div className='h-[560px] w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
            <Form {...form}>
              <form
                id='cases-form'
                onSubmit={form.handleSubmit(onSubmit)}
                className='grid grid-cols-2 gap-4 px-0.5'
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
                      <FormLabel className='col-span-2 text-end'>
                        发票号
                      </FormLabel>
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
                    const selectedLabel =
                      progressOptions.find((o) => o.key === field.value)
                        ?.value ?? ''
                    return (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          案件进度
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl className='col-span-4'>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'col-span-4 w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {selectedLabel || '请选择案件进度'}
                                <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-[480px] p-0'
                            align='start'
                          >
                            <Command>
                              <CommandInput placeholder='搜索案件进度...' />
                              <CommandList>
                                <CommandEmpty>暂无结果</CommandEmpty>
                                <CommandGroup>
                                  {progressOptions.map((o) => (
                                    <CommandItem
                                      value={o.value}
                                      key={o.key}
                                      onSelect={() => {
                                        form.setValue('case_progress', o.key, {
                                          shouldDirty: true,
                                          shouldValidate: false,
                                        })
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          'size-4',
                                          o.key === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                      />
                                      {o.value}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                      <FormLabel className='col-span-2 text-end'>
                        紧急案件
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {urgentOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-urgent-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-urgent-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_inquiry_type'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        需求類型
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {inquiryTypeOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-inquiry-type-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-inquiry-type-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_incharge'
                  render={({ field }) => {
                    const selectedKeys = splitCsvKeys(field.value).map((k) =>
                      k.toUpperCase()
                    )
                    const keySet = new Set(selectedKeys)
                    const toggleKey = (key: string, checked: boolean) => {
                      const current = splitCsvKeys(field.value)
                      const curSet = new Set(
                        current.map((k) => k.toUpperCase())
                      )
                      const keyUpper = key.toUpperCase()
                      if (checked) curSet.add(keyUpper)
                      else curSet.delete(keyUpper)
                      const orderedKeys = inchargeOptions
                        .map((o) => o.key)
                        .filter((k) => curSet.has(k.toUpperCase()))
                      const merged = Array.from(
                        new Set([
                          ...orderedKeys,
                          ...current.filter((k) => curSet.has(k.toUpperCase())),
                        ])
                      )
                      form.setValue('case_incharge', joinCsvKeys(merged), {
                        shouldDirty: true,
                        shouldValidate: false,
                      })
                    }
                    return (
                      <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 pt-1.5 text-end'>
                          案件负责人
                        </FormLabel>
                        <div className='col-span-4 flex flex-wrap items-start gap-x-5 gap-y-2.5'>
                          {inchargeOptions.map((o) => {
                            const checked = keySet.has(o.key.toUpperCase())
                            return (
                              <FormItem
                                key={o.key}
                                className='flex items-center space-y-0'
                              >
                                <FormControl>
                                  <Checkbox
                                    id={`case-incharge-${o.key}`}
                                    checked={checked}
                                    onCheckedChange={(c) =>
                                      toggleKey(o.key, !!c)
                                    }
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={`case-incharge-${o.key}`}
                                  className='ms-2 cursor-pointer font-normal select-none'
                                >
                                  {o.value}
                                </Label>
                              </FormItem>
                            )
                          })}
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
                    const selectedLabel = resolveRankLabel(field.value)
                    return (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          案件评级
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant='outline'
                                role='combobox'
                                className={cn(
                                  'col-span-4 w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? selectedLabel : '请选择案件评级'}
                                <CaretSortIcon className='ms-2 h-4 w-4 shrink-0 opacity-50' />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className='w-[480px] p-0'
                            align='start'
                          >
                            <Command>
                              <CommandInput
                                placeholder='搜索案件评级...'
                                className='h-9'
                              />
                              <CommandEmpty>暂无结果</CommandEmpty>
                              <CommandGroup>
                                {rankOptions.map((o) => (
                                  <CommandItem
                                    value={o.value}
                                    key={o.key}
                                    onSelect={() => {
                                      form.setValue('case_rank', o.key, {
                                        shouldDirty: true,
                                        shouldValidate: false,
                                      })
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        o.key.toUpperCase() ===
                                          (field.value ?? '').toUpperCase()
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    {o.value}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                      <FormLabel className='col-span-2 text-end'>
                        当日需处理
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {handleTodayOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-handle-today-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-handle-today-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
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
                        船東联络人
                      </FormLabel>
                      <div className='col-span-4'>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              placeholder='点击输入框从联络人列表中选择...'
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
                                  variant='ghost'
                                  size='sm'
                                  type='button'
                                  className='pointer-events-auto h-7 w-7 p-0 hover:bg-muted'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearOwner()
                                  }}
                                  aria-label='清空联络人'
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
                                aria-label='选择联络人'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <UserRound className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(ownerDisplay.phone ||
                          ownerDisplay.email ||
                          ownerDisplay.team ||
                          ownerDisplay.department ||
                          ownerDisplay.rank) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {ownerDisplay.phone && (
                              <div>电话：{ownerDisplay.phone}</div>
                            )}
                            {ownerDisplay.email && (
                              <div>邮箱：{ownerDisplay.email}</div>
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
                            联络人：{field.value}
                            （未找到对应联络人详情，将直接保存）
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
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
                              placeholder='点击输入框从船厂经营列表中选择...'
                              className='cursor-pointer pe-20 pr-20'
                              readOnly
                              value={field.value || ''}
                              onClick={() => setShipyardPickerOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setShipyardPickerOpen(true)
                                }
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                              {field.value ? (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  type='button'
                                  className='pointer-events-auto h-7 w-7 p-0 hover:bg-muted'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearShipyard()
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
                                aria-label='选择船厂经营'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <Factory className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(shipyardDisplay.mobile ||
                          shipyardDisplay.email ||
                          shipyardDisplay.type ||
                          shipyardDisplay.rank ||
                          shipyardDisplay.division) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {shipyardDisplay.mobile && (
                              <div>手机：{shipyardDisplay.mobile}</div>
                            )}
                            {shipyardDisplay.email && (
                              <div>邮箱：{shipyardDisplay.email}</div>
                            )}
                            {shipyardDisplay.type && (
                              <div>类型：{shipyardDisplay.type}</div>
                            )}
                            {shipyardDisplay.division && (
                              <div>业务归属：{shipyardDisplay.division}</div>
                            )}
                            {shipyardDisplay.rank && (
                              <div>职级：{shipyardDisplay.rank}</div>
                            )}
                          </div>
                        )}
                        {field.value && !shipyardDisplay.name && (
                          <p className='mt-1 text-xs text-muted-foreground/80'>
                            船厂经营：{field.value}
                            （未找到对应船厂经营详情，将直接保存）
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
                              placeholder='点击输入框从案件代理列表中选择...'
                              className='cursor-pointer pe-20 pr-20'
                              readOnly
                              value={field.value || ''}
                              onClick={() => setAgentPickerOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setAgentPickerOpen(true)
                                }
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                              {field.value ? (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  type='button'
                                  className='pointer-events-auto h-7 w-7 p-0 hover:bg-muted'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearAgent()
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
                                aria-label='选择案件代理'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <Briefcase className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(agentDisplay.mobile ||
                          agentDisplay.email ||
                          agentDisplay.type ||
                          agentDisplay.rank ||
                          agentDisplay.division) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {agentDisplay.mobile && (
                              <div>手机：{agentDisplay.mobile}</div>
                            )}
                            {agentDisplay.email && (
                              <div>邮箱：{agentDisplay.email}</div>
                            )}
                            {agentDisplay.type && (
                              <div>类型：{agentDisplay.type}</div>
                            )}
                            {agentDisplay.division && (
                              <div>业务归属：{agentDisplay.division}</div>
                            )}
                            {agentDisplay.rank && (
                              <div>职级：{agentDisplay.rank}</div>
                            )}
                          </div>
                        )}
                        {field.value && !agentDisplay.name && (
                          <p className='mt-1 text-xs text-muted-foreground/80'>
                            案件代理：{field.value}
                            （未找到对应案件代理详情，将直接保存）
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
                              placeholder='点击输入框从案件机务列表中选择...'
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
                                  variant='ghost'
                                  size='sm'
                                  type='button'
                                  className='pointer-events-auto h-7 w-7 p-0 hover:bg-muted'
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
                                aria-label='选择案件机务'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <Cog className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(superintendentDisplay.phone ||
                          superintendentDisplay.email ||
                          superintendentDisplay.team ||
                          superintendentDisplay.department ||
                          superintendentDisplay.rank) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {superintendentDisplay.phone && (
                              <div>电话：{superintendentDisplay.phone}</div>
                            )}
                            {superintendentDisplay.email && (
                              <div>邮箱：{superintendentDisplay.email}</div>
                            )}
                            {superintendentDisplay.team && (
                              <div>小组：{superintendentDisplay.team}</div>
                            )}
                            {superintendentDisplay.department && (
                              <div>
                                部门：{superintendentDisplay.department}
                              </div>
                            )}
                            {superintendentDisplay.rank && (
                              <div>职级：{superintendentDisplay.rank}</div>
                            )}
                          </div>
                        )}
                        {field.value && !superintendentDisplay.name && (
                          <p className='mt-1 text-xs text-muted-foreground/80'>
                            案件机务：{field.value}
                            （未找到对应案件机务详情，将直接保存）
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
                              placeholder='点击输入框从案件船检列表中选择...'
                              className='cursor-pointer pe-20 pr-20'
                              readOnly
                              value={field.value || ''}
                              onClick={() => setSurveyorPickerOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSurveyorPickerOpen(true)
                                }
                              }}
                            />
                            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pe-2 pr-2'>
                              {field.value ? (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  type='button'
                                  className='pointer-events-auto h-7 w-7 p-0 hover:bg-muted'
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClearSurveyor()
                                  }}
                                  aria-label='清空案件船检'
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
                                aria-label='选择案件船检'
                              >
                                <Search className='h-3.5 w-3.5' />
                              </Button>
                              <Ship className='me-1 mr-1 h-3.5 w-3.5 text-muted-foreground' />
                            </div>
                          </div>
                        </FormControl>
                        {(surveyorDisplay.mobile ||
                          surveyorDisplay.email ||
                          surveyorDisplay.type ||
                          surveyorDisplay.rank ||
                          surveyorDisplay.division) && (
                          <div className='mt-1 flex flex-nowrap gap-x-3 text-xs whitespace-nowrap text-muted-foreground/80'>
                            {surveyorDisplay.mobile && (
                              <div>手机：{surveyorDisplay.mobile}</div>
                            )}
                            {surveyorDisplay.email && (
                              <div>邮箱：{surveyorDisplay.email}</div>
                            )}
                            {surveyorDisplay.type && (
                              <div>类型：{surveyorDisplay.type}</div>
                            )}
                            {surveyorDisplay.division && (
                              <div>业务归属：{surveyorDisplay.division}</div>
                            )}
                            {surveyorDisplay.rank && (
                              <div>职级：{surveyorDisplay.rank}</div>
                            )}
                          </div>
                        )}
                        {field.value && !surveyorDisplay.name && (
                          <p className='mt-1 text-xs text-muted-foreground/80'>
                            案件船检：{field.value}
                            （未找到对应案件船检详情，将直接保存）
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
                  render={({ field }) => (
                    <FormItem className='col-span-1 grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 pt-2 text-end'>
                        承运人｜服务负责人
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='请输入承运人｜服务负责人'
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
                  name='vessel_position'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        船舶位置
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value || ''}
                        className='col-span-4 flex flex-wrap items-center gap-x-5 gap-y-2'
                      >
                        {positionOptions.map((o) => (
                          <FormItem
                            key={o.key}
                            className='flex items-center space-y-0'
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={o.key}
                                id={`case-position-${o.key}`}
                              />
                            </FormControl>
                            <Label
                              htmlFor={`case-position-${o.key}`}
                              className='ms-2 cursor-pointer font-normal select-none'
                            >
                              {o.value}
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                      <FormMessage className='col-span-4 col-start-3' />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='case_settlement_done'
                  render={({ field }) => (
                    <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                      <FormLabel className='col-span-2 text-end'>
                        案件结算完成日期
                      </FormLabel>
                      <FormControl>
                        <Input type='date' className='col-span-4' {...field} />
                      </FormControl>
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
                          placeholder='由「船名」// 「需求名称」//「询价日期」生成'
                          className='col-span-10 cursor-not-allowed bg-muted/40'
                          readOnly
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='col-span-10 col-start-3' />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                form.reset()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type='submit' form='cases-form' disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VesselPickerDialog
        open={vesselPickerOpen}
        onOpenChange={setVesselPickerOpen}
        initialSelectedName={form.getValues('vessel_name') || undefined}
        onSelect={handleVesselPicked}
      />

      <OwnerPickerDialog
        open={ownerPickerOpen}
        onOpenChange={setOwnerPickerOpen}
        initialSelectedName={form.getValues('owner_following') || undefined}
        onSelect={handleOwnerPicked}
      />

      <ShipyardPickerDialog
        open={shipyardPickerOpen}
        onOpenChange={setShipyardPickerOpen}
        initialSelectedName={form.getValues('shipyard_business') || undefined}
        onSelect={handleShipyardPicked}
      />

      <AgentPickerDialog
        open={agentPickerOpen}
        onOpenChange={setAgentPickerOpen}
        initialSelectedName={form.getValues('case_agent') || undefined}
        onSelect={handleAgentPicked}
      />

      <SuperintendentPickerDialog
        open={superintendentPickerOpen}
        onOpenChange={setSuperintendentPickerOpen}
        initialSelectedName={form.getValues('case_superintendent') || undefined}
        onSelect={handleSuperintendentPicked}
      />

      <SurveyorPickerDialog
        open={surveyorPickerOpen}
        onOpenChange={setSurveyorPickerOpen}
        initialSelectedName={form.getValues('case_surveyor') || undefined}
        onSelect={handleSurveyorPicked}
      />
    </>
  )
}
