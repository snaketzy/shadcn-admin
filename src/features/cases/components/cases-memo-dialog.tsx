'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Paperclip as PaperclipIcon,
  Plus as PlusIcon,
  Save as SaveIcon,
  X as XIcon,
  Trash2 as Trash2Icon,
  StickyNote as StickyNoteIcon,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  createCaseMemo,
  deleteCaseMemo,
  fetchCaseMemoListByCaseId,
  parseAttachments,
  type CaseMemo,
  type CaseMemoAttachment,
} from '../api/client'
import type { Case } from '../data/schema'

type CasesMemoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Case
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatNowForDatetimeLocal(now: Date): string {
  const y = now.getFullYear()
  const m = pad2(now.getMonth() + 1)
  const d = pad2(now.getDate())
  const hh = pad2(now.getHours())
  const mm = pad2(now.getMinutes())
  return `${y}-${m}-${d}T${hh}:${mm}`
}

function formatDisplayDate(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = String(raw).replace(' ', 'T')
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    return raw.replace('T', ' ').slice(0, 16)
  }
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `${y}/${m}/${day} ${hh}:${mm}`
}

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024 // 20MB
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

function filenameAllowed(name: string): boolean {
  const i = name.lastIndexOf('.')
  if (i < 0) return false
  const ext = name.slice(i + 1).toLowerCase()
  return ALLOWED_ATTACHMENT_EXTS.includes(ext)
}

export function CasesMemoDialog({
  open,
  onOpenChange,
  currentRow,
}: CasesMemoDialogProps) {
  const queryClient = useQueryClient()
  const [memoDate, setMemoDate] = useState<string>('')
  const [memoContent, setMemoContent] = useState<string>('')
  const [memoRemark, setMemoRemark] = useState<string>('')
  const [attachments, setAttachments] = useState<CaseMemoAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const caseNo = currentRow?.case_id ?? 0
  const caseNumberText =
    currentRow?.case_id != null ? `案件 #${currentRow.case_id}` : ''
  const caseInquiryKeyword = currentRow?.case_inquiry_keyword ?? ''
  const vesselName = currentRow?.vessel_name ?? ''

  const {
    data: memoList = [],
    isFetching: isLoadingMemoList,
    refetch,
  } = useQuery({
    queryKey: ['case-memo-list', caseNo],
    queryFn: () => fetchCaseMemoListByCaseId(caseNo),
    enabled: open && caseNo > 0,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (open) {
      if (!memoDate) {
        setMemoDate(formatNowForDatetimeLocal(new Date()))
      }
      setMemoContent('')
      setMemoRemark('')
      setAttachments([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const saveModeRef = useRef<'close' | 'new' | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      createCaseMemo({
        case_id: caseNo,
        case_memo_date: memoDate ? memoDate.replace('T', ' ') : null,
        case_memo_content: memoContent.trim() || null,
        case_memo_remark: memoRemark.trim() || null,
        case_memo_attachment: attachments.length > 0 ? attachments : null,
      }),
    onSuccess: (row) => {
      if (row) {
        void refetch()
        queryClient.invalidateQueries({ queryKey: ['case-memo-list', caseNo] })
        queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === 'case-memo-list-by-page-case-ids',
        })
        const mode = saveModeRef.current
        saveModeRef.current = null
        if (mode === 'close') {
          toast.success('备忘已保存')
          onOpenChange(false)
        } else if (mode === 'new') {
          toast.success('备忘已保存，可继续新增')
          setMemoContent('')
          setMemoRemark('')
          setAttachments([])
          setMemoDate(formatNowForDatetimeLocal(new Date()))
        }
      } else {
        saveModeRef.current = null
        toast.error('保存失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      saveModeRef.current = null
      toast.error(`保存失败: ${err.message}`)
    },
  })

  const canSave =
    !createMutation.isPending &&
    (memoContent.trim().length > 0 ||
      memoRemark.trim().length > 0 ||
      attachments.length > 0)

  const handleSaveAndClose = () => {
    if (!canSave) return
    saveModeRef.current = 'close'
    createMutation.mutate()
  }

  const handleSaveAndNew = () => {
    if (!canSave) return
    saveModeRef.current = 'new'
    createMutation.mutate()
  }

  const deleteMutation = useMutation({
    mutationFn: (memoId: number) => deleteCaseMemo(memoId),
    onSuccess: (ok) => {
      if (ok) {
        toast.success('备忘已删除')
        void refetch()
        queryClient.invalidateQueries({ queryKey: ['case-memo-list', caseNo] })
        queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === 'case-memo-list-by-page-case-ids',
        })
      } else {
        toast.error('删除失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      toast.error(`删除失败: ${err.message}`)
    },
  })

  const handleAttachmentsPick = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const accepted: CaseMemoAttachment[] = []
    const rejected: string[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > MAX_ATTACHMENT_SIZE) {
        rejected.push(`${f.name}：超过 20MB`)
        continue
      }
      if (!filenameAllowed(f.name)) {
        rejected.push(`${f.name}：不支持该类型`)
        continue
      }
      accepted.push({
        name: f.name,
        size: f.size,
        type: f.type || undefined,
      })
    }
    if (rejected.length > 0) {
      toast.warning(`以下文件未添加：${rejected.join('；')}`)
    }
    if (accepted.length > 0) {
      setAttachments((prev) => {
        const merged = [...prev]
        for (const a of accepted) {
          if (merged.some((p) => p.name === a.name)) continue
          merged.push(a)
        }
        return merged
      })
    }
  }

  const caseTitle = (
    <div className='flex flex-wrap items-center gap-3'>
      <StickyNoteIcon className='me-1 inline h-5 w-5 text-primary' />
      <span className='font-semibold'>案件备忘</span>
      {vesselName && (
        <span className='text-base text-muted-foreground'>
          （船名：
          <span className='font-medium text-foreground'>{vesselName}</span>）
        </span>
      )}
    </div>
  )

  const caseHeaderMeta = (
    <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
      {caseInquiryKeyword && (
        <span className='text-base'>
          <span className='text-muted-foreground'>需求编号/名称：</span>
          <span className='font-mono font-medium'>{caseInquiryKeyword}</span>
        </span>
      )}
      {caseNumberText && (
        <Badge
          variant='outline'
          className='rounded-full border-border bg-transparent'
        >
          {caseNumberText}
        </Badge>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className='flex h-[90vh] max-h-[90vh] flex-col overflow-hidden p-6 sm:max-w-4xl'
      >
        <DialogHeader className='shrink-0 text-start'>
          <DialogTitle className='text-xl leading-7'>{caseTitle}</DialogTitle>
          <DialogDescription className='sr-only'>
            案件备忘：添加与查看历史备忘
          </DialogDescription>
          {caseHeaderMeta}
        </DialogHeader>

        <Separator className='-mx-6 w-[calc(100%+3rem)] shrink-0' />

        <div className='min-h-0 w-[calc(100%+0.75rem)] flex-1 overflow-y-auto py-5 pe-3'>
          <div className='grid grid-cols-[150px_1fr] items-start gap-x-6 gap-y-5'>
            <Label className='pt-2 text-sm font-semibold text-foreground/90'>
              备忘日期
            </Label>
            <div>
              <Input
                type='datetime-local'
                value={memoDate}
                onChange={(e) => setMemoDate(e.target.value)}
                className={cn(
                  'h-10 text-base font-medium tracking-wide',
                  'focus-visible:ring-2 focus-visible:ring-primary/60'
                )}
              />
            </div>

            <Label className='pt-2 text-sm font-semibold text-foreground/90'>
              备忘内容
            </Label>
            <Textarea
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              placeholder='请输入备忘内容...'
              rows={4}
              className='min-h-[110px] resize-y'
            />

            <Label className='pt-2 text-sm font-semibold text-foreground/90'>
              备忘备注
            </Label>
            <Input
              value={memoRemark}
              onChange={(e) => setMemoRemark(e.target.value)}
              placeholder='请输入备忘备注...'
            />

            <Label className='pt-2 text-sm font-semibold text-foreground/90'>
              备忘附件
            </Label>
            <div className='flex flex-col gap-2'>
              <div className='flex flex-wrap items-center gap-3'>
                <input
                  ref={fileInputRef}
                  type='file'
                  multiple
                  className='hidden'
                  accept='.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,image/*,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                  onChange={(e) => {
                    handleAttachmentsPick(e.target.files)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant='outline'
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='h-10 gap-2 px-4'
                >
                  <PaperclipIcon size={16} />
                  <span>选择文件</span>
                </Button>
                <p className='text-sm text-muted-foreground'>
                  支持 PDF / 图片 / Word / Excel / PPT / TXT / CSV 等，单文件 ≤
                  20MB，可多选
                </p>
              </div>
              {attachments.length > 0 && (
                <div className='flex flex-wrap gap-2 pt-1'>
                  {attachments.map((a, idx) => (
                    <Badge
                      key={`${a.name}-${idx}`}
                      variant='secondary'
                      className='h-8 gap-1 rounded-full px-3 py-0 text-xs font-normal'
                    >
                      <PaperclipIcon size={12} className='opacity-70' />
                      <span className='max-w-[16rem] truncate'>{a.name}</span>
                      {a.size != null && (
                        <span className='opacity-60'>
                          ({formatBytes(a.size)})
                        </span>
                      )}
                      <button
                        type='button'
                        aria-label={`移除附件 ${a.name}`}
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className='ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-foreground/10'
                      >
                        <XIcon size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator className='col-span-2 my-1' />

            <Label className='pt-1 text-sm font-semibold text-foreground/90'>
              历史备忘
            </Label>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div />
                <span className='text-sm text-muted-foreground'>
                  共 {memoList.length} 条备忘
                </span>
              </div>

              {memoList.length === 0 ? (
                <div
                  className={cn(
                    'rounded-lg border border-dashed px-6 py-10 text-center',
                    'text-muted-foreground',
                    'border-border bg-muted/20'
                  )}
                >
                  {isLoadingMemoList ? (
                    '历史备忘加载中...'
                  ) : (
                    <>暂无历史备忘，填写上方表单后点击「保存备忘」即可添加。</>
                  )}
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-3'>
                  {memoList.map((m) => (
                    <MemoHistoryItem
                      key={m.case_memo_id}
                      memo={m}
                      isDeleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === m.case_memo_id
                      }
                      onDelete={() => {
                        if (
                          window.confirm(
                            '确定要删除该条备注吗？该操作不可恢复。'
                          )
                        ) {
                          deleteMutation.mutate(m.case_memo_id)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className='-mx-6 w-[calc(100%+3rem)] shrink-0' />
        <DialogFooter className='mt-2 shrink-0 pt-4'>
          <DialogClose asChild>
            <Button variant='outline' type='button' className='h-10 px-5'>
              关闭
            </Button>
          </DialogClose>
          <Button
            type='button'
            variant='secondary'
            onClick={handleSaveAndNew}
            disabled={!canSave || createMutation.isPending}
            className='h-10 gap-2 px-5'
          >
            <PlusIcon size={16} />
            {createMutation.isPending ? '保存中...' : '保存并新增备忘'}
          </Button>
          <Button
            type='button'
            onClick={handleSaveAndClose}
            disabled={!canSave || createMutation.isPending}
            className='h-10 gap-2 px-5'
          >
            <SaveIcon size={16} />
            {createMutation.isPending ? '保存中...' : '保存备忘'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemoHistoryItem({
  memo,
  isDeleting,
  onDelete,
}: {
  memo: CaseMemo
  isDeleting: boolean
  onDelete: () => void
}) {
  const atts = useMemo(
    () => parseAttachments(memo.case_memo_attachment),
    [memo.case_memo_attachment]
  )
  const hasAttachments = atts.length > 0
  const hasContent = (memo.case_memo_content ?? '').trim().length > 0
  const hasRemark = (memo.case_memo_remark ?? '').trim().length > 0

  return (
    <Card className='overflow-hidden border-border/80 shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-2 space-y-0 pb-2'>
        <div className='flex flex-col gap-1'>
          <CardTitle className='flex flex-wrap items-center gap-2 text-sm font-semibold'>
            <Badge
              variant='outline'
              className='rounded-full px-2.5 py-0 text-xs font-medium'
            >
              <span className='opacity-70'>#</span>
              {memo.case_memo_id}
            </Badge>
            <span className='tabular-nums'>
              {formatDisplayDate(memo.case_memo_date)}
            </span>
          </CardTitle>
          <CardDescription className='text-xs'>
            创建于 {formatDisplayDate(memo.created_at)}
            {memo.updated_at && memo.updated_at !== memo.created_at && (
              <> ｜ 编辑于 {formatDisplayDate(memo.updated_at)}</>
            )}
          </CardDescription>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-destructive/80 hover:bg-destructive/10 hover:text-destructive'
          onClick={onDelete}
          disabled={isDeleting}
          aria-label='删除该备忘'
        >
          <Trash2Icon size={16} />
        </Button>
      </CardHeader>
      {(hasContent || hasRemark || hasAttachments) && (
        <CardContent className='space-y-3 pt-0'>
          {hasContent && (
            <div className='text-sm leading-7 break-words whitespace-pre-wrap text-foreground/90'>
              {memo.case_memo_content}
            </div>
          )}
          {hasRemark && (
            <div className='rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
              <span className='me-2 font-medium text-foreground/80'>
                备注：
              </span>
              {memo.case_memo_remark}
            </div>
          )}
          {hasAttachments && (
            <div className='flex flex-wrap gap-2'>
              {atts.map((a, i) => (
                <Badge
                  key={`${a.name}-${i}`}
                  variant='secondary'
                  className='gap-1 rounded-full px-2.5 py-0.5 text-xs font-normal'
                >
                  <PaperclipIcon size={11} className='opacity-70' />
                  <span className='max-w-[14rem] truncate'>{a.name}</span>
                  {a.size != null && (
                    <span className='opacity-60'>({formatBytes(a.size)})</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      )}
      {!hasContent && !hasRemark && !hasAttachments && (
        <CardContent className='pt-0 text-sm text-muted-foreground'>
          （该备注为空）
        </CardContent>
      )}
      <CardFooter className='h-2 border-t border-transparent py-0' />
    </Card>
  )
}
