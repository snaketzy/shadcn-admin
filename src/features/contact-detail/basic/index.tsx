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
import { useContactDetail } from '../contact-detail-route'
import { getBadgeColor } from '@/features/contacts/data/data'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@radix-ui/react-icons'

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

function resolveDictLabel(
  raw: string | null | undefined,
  dict: { dict_key: string; dict_value: string }[]
): string {
  if (!raw) return ''
  const byKey = dict.find(
    (d) => d.dict_key.toUpperCase() === raw.toUpperCase()
  )
  if (byKey) return byKey.dict_value
  const byValue = dict.find((d) => d.dict_value === raw)
  return byValue ? byValue.dict_value : raw
}

export function ContactDetailBasic() {
  const { contact, groups, supplierRows, collaborationRows } =
    useContactDetail()

  const supplierShortnameMap = useMemo(() => {
    const m = new Map<string, { shortname: string; name: string }>()
    for (const s of supplierRows) {
      const id = String(s.supplier_id)
      m.set(id, {
        shortname: s.supplier_shortname?.trim() || '',
        name: s.supplier_name || '',
      })
    }
    return m
  }, [supplierRows])

  const collaborationShortnameMap = useMemo(() => {
    const m = new Map<string, { shortname: string; name: string }>()
    for (const c of collaborationRows) {
      const id = String(c.collaboration_id)
      m.set(id, {
        shortname: c.collaboration_shortname?.trim() || '',
        name: c.collaboration_name || '',
      })
    }
    return m
  }, [collaborationRows])

  const divisionTypeLabel = resolveDictLabel(
    contact?.contact_division_type,
    groups.divisionDict
  )
  const divisionDisplay = useMemo(() => {
    const id = contact?.contact_division_id
    const type = (contact?.contact_division_type ?? '').toUpperCase()
    if (!id) return null
    const idStr = String(id)
    if (type === 'K1') {
      const d = supplierShortnameMap.get(idStr)
      return d ?? { shortname: '', name: '', id: idStr, type: 'K1' as const }
    }
    if (type === 'K2') {
      const d = collaborationShortnameMap.get(idStr)
      return d ?? { shortname: '', name: '', id: idStr, type: 'K2' as const }
    }
    return { shortname: '', name: '', id: idStr, type: null }
  }, [contact, supplierShortnameMap, collaborationShortnameMap])

  if (!contact) return null

  return (
    <ContentSection
      title='基本信息'
      desc='该联系人的基础档案信息，包括姓名、类型、职级、所属单位与联系方式等。'
    >
      <div className='space-y-4'>
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <CardTitle className='text-base'>基础档案</CardTitle>
                <CardDescription>姓名、类型、职级、备注等基础字段</CardDescription>
              </div>
              <Link
                to='/contact_list'
                className='flex items-center gap-1 text-xs text-muted-foreground hover:underline'
              >
                返回联系人列表
                <ArrowRightIcon className='size-3' />
              </Link>
            </div>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='联系人ID'>
              <span className='font-mono text-muted-foreground'>
                {contact.contact_id}
              </span>
            </FieldValue>
            <FieldValue label='联系人名称'>
              <span className='font-medium'>{contact.contact_name || '-'}</span>
            </FieldValue>
            <FieldValue label='联系人类型'>
              {(() => {
                const label = resolveDictLabel(
                  contact.contact_type,
                  groups.typeDict
                )
                if (!label)
                  return <span className='text-muted-foreground'>-</span>
                return (
                  <Badge
                    variant='outline'
                    className={cn(getBadgeColor(label))}
                  >
                    {label}
                  </Badge>
                )
              })()}
            </FieldValue>
            <FieldValue label='联系人职级'>
              {(() => {
                const label = resolveDictLabel(
                  contact.contact_rank,
                  groups.rankDict
                )
                if (!label)
                  return <span className='text-muted-foreground'>-</span>
                return (
                  <Badge
                    variant='outline'
                    className={cn(getBadgeColor(label))}
                  >
                    {label}
                  </Badge>
                )
              })()}
            </FieldValue>
            <FieldValue label='备注'>
              <div className='whitespace-pre-wrap leading-relaxed'>
                {contact.contact_remark || (
                  <span className='text-muted-foreground'>-</span>
                )}
              </div>
            </FieldValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>所属单位</CardTitle>
            <CardDescription>
              该联系人关联的供应商/协作商档案，联动由「联系人类型」自动决定是 K1/K2
            </CardDescription>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='单位类型'>
              {divisionTypeLabel ? (
                <Badge
                  variant='outline'
                  className={cn(getBadgeColor(divisionTypeLabel))}
                >
                  {divisionTypeLabel}
                </Badge>
              ) : (
                <span className='text-muted-foreground'>（未指定）</span>
              )}
            </FieldValue>
            <FieldValue label='单位档案'>
              {divisionDisplay && (
                (() => {
                  const short =
                    'shortname' in divisionDisplay
                      ? (divisionDisplay as { shortname: string }).shortname
                      : ''
                  const name =
                    'name' in divisionDisplay
                      ? (divisionDisplay as { name: string }).name
                      : ''
                  const id =
                    'id' in divisionDisplay
                      ? (divisionDisplay as { id: string }).id
                      : String(contact.contact_division_id ?? '')
                  const t =
                    'type' in divisionDisplay
                      ? (divisionDisplay as { type: 'K1' | 'K2' | null }).type
                      : (contact.contact_division_type ?? '')
                  const link =
                    t === 'K1'
                      ? `/supplier_detail/${id}`
                      : t === 'K2'
                        ? null
                        : null
                  if (!short && !name && !id)
                    return <span className='text-muted-foreground'>-</span>
                  return (
                    <div className='space-y-1.5'>
                      <div className='flex flex-wrap items-center gap-2'>
                        {short && (
                          <Badge
                            variant='outline'
                            className={cn(getBadgeColor(short))}
                          >
                            简称：{short}
                          </Badge>
                        )}
                        {link ? (
                          <Link
                            to={link as any}
                            className='inline-flex items-center gap-1 text-xs text-primary hover:underline'
                          >
                            {name || id}
                            <ArrowRightIcon className='size-3' />
                          </Link>
                        ) : (
                          <span className='font-medium'>
                            {name || (
                              <span className='font-mono text-muted-foreground'>
                                ID：{id}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {short && name && short !== name && (
                        <div className='text-xs text-muted-foreground break-words'>
                          全称：{name}
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
            </FieldValue>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>联系方式</CardTitle>
            <CardDescription>
              手机、邮箱等直接联系渠道，点击可直接发起通话 / 发送邮件
            </CardDescription>
          </CardHeader>
          <CardContent className='divide-y border-t'>
            <FieldValue label='手机'>
              {contact.contact_mobile ? (
                <a
                  href={`tel:${contact.contact_mobile}`}
                  className='hover:underline font-mono text-sm'
                >
                  {contact.contact_mobile}
                </a>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
            <FieldValue label='邮箱'>
              {contact.contact_email ? (
                <a
                  href={`mailto:${contact.contact_email}`}
                  className='hover:underline break-all'
                >
                  {contact.contact_email}
                </a>
              ) : (
                <span className='text-muted-foreground'>-</span>
              )}
            </FieldValue>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
