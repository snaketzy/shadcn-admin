import { useMemo } from 'react'
import { ContentSection } from '@/features/settings/components/content-section'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSupplierDetail } from '../supplier-detail-route'
import { getBadgeColor } from '@/features/suppliers/data/data'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@radix-ui/react-icons'

type DictMap = { keyMap: Map<string, string>; valueMap: Map<string, string> }

function makeDictMap(dict: { dict_key: string; dict_value: string }[]): DictMap {
  const keyMap = new Map<string, string>()
  const valueMap = new Map<string, string>()
  for (const d of dict) {
    const k = String(d.dict_key).toUpperCase()
    keyMap.set(k, d.dict_value)
    valueMap.set(d.dict_value, d.dict_value)
  }
  return { keyMap, valueMap }
}

function resolveLabels(raw: unknown, { keyMap, valueMap }: DictMap): string[] {
  if (raw === null || raw === undefined || raw === '') return []
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    let resolved = keyMap.get(p.toUpperCase())
    if (!resolved) resolved = valueMap.get(p)
    if (!resolved) resolved = p
    if (!resolved) continue
    if (seen.has(resolved)) continue
    seen.add(resolved)
    out.push(resolved)
  }
  return out
}

type FieldValueProps = {
  label: string
  children: React.ReactNode
}

function FieldValue({ label, children }: FieldValueProps) {
  return (
    <div className='grid grid-cols-6 items-start gap-4 py-3'>
      <div className='col-span-2 pt-0.5 text-sm text-muted-foreground text-end'>
        {label}
      </div>
      <div className='col-span-4 text-sm break-words'>{children}</div>
    </div>
  )
}

export function SupplierDetailInfo() {
  const { supplier, supplierId, fieldDict } = useSupplierDetail()

  const fieldMap = useMemo(() => makeDictMap(fieldDict), [fieldDict])
  const fieldLabels = useMemo(
    () => resolveLabels(supplier?.supplier_field, fieldMap),
    [supplier?.supplier_field, fieldMap]
  )

  if (!supplier) return null

  return (
    <ContentSection
      title='供应商信息'
      desc='该供应商的业务维度信息，包括经营范围、主营方向及备注说明。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>业务信息</CardTitle>
                <CardDescription>经营范围、主营、备注字段</CardDescription>
              </div>
              <Link
                to='/supplier_detail/$supplierId'
                params={{ supplierId }}
                className='flex items-center gap-1 text-xs text-muted-foreground hover:underline'
              >
                返回基本信息
                <ArrowRightIcon className='size-3 rotate-180' />
              </Link>
            </div>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='供应商ID'>
              <span className='font-mono text-muted-foreground'>
                {supplier.supplier_id}
              </span>
            </FieldValue>
            <FieldValue label='供应商简称'>
              {supplier.supplier_shortname ? (
                <Badge
                  variant='outline'
                  className={cn(getBadgeColor(supplier.supplier_shortname))}
                >
                  {supplier.supplier_shortname}
                </Badge>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='经营范围'>
              {fieldLabels.length > 0 ? (
                <div className='flex flex-wrap gap-1'>
                  {fieldLabels.map((l) => (
                    <Badge
                      key={l}
                      variant='outline'
                      className={cn(getBadgeColor(l))}
                    >
                      {l}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='供应商主营'>
              {supplier.supplier_advantage ? (
                <Badge
                  variant='outline'
                  className={cn(getBadgeColor(supplier.supplier_advantage))}
                >
                  {supplier.supplier_advantage}
                </Badge>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='供应商备注'>
              <div className='whitespace-pre-wrap leading-relaxed'>
                {supplier.supplier_remark || (
                  <span className='text-muted-foreground'>-</span>
                )}
              </div>
            </FieldValue>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
