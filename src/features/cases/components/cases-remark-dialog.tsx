'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  FileImage,
  FileText,
  Paperclip,
  Save,
  StickyNotePlus,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LongText } from '@/components/long-text'
import { type Case } from '../data/schema'
import {
  createCaseMemo,
  fetchCaseMemosByCaseId,
  type CaseMemo,
  type CaseMemoAttachment,
} from '../api/client'

const formSchema = z.object({
  case_memo_date: z.string().min(1, { message: '请选择备忘录日期' }),
  case_memo_content: z.string().optional().catch(''),
  case_memo_remark: z.string().optional().catch(''),
})

type MemoFormValues = z.infer<typeof formSchema>

type PendingAttachment = {
  id: string
  name: string
  size: number
  type: string
  data: string
}

const ACCEPT_FILETYPES =
  '.pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf'

const ALLOWED_MIME_PREFIX = [
  'image/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'application/rtf',
]

function isAllowedFileType(file: File): boolean {
  const t = (file.type || '').toLowerCase()
  const n = (file.name || '').toLowerCase()
  if (
    ALLOWED_MIME_PREFIX.some(
      (p) => t === p || (p.endsWith('/') && t.startsWith(p)) || t.startsWith(p)
    )
  ) {
    return true
  }
  return /\.(pdf|png|jpe?g|gif|webp|bmp|svg|docx?|xlsx?|pptx?|txt|csv|rtf)$/i.test(
    n
  )
}

function isImageMime(mime: string): boolean {
  return /^image\//i.test(mime || '')
}

function isPdfMime(mime: string): boolean {
  return /pdf/i.test(mime || '')
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
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
  const hyphen = str.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(hyphen)) {
    const now = new Date()
    return `${hyphen}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  }
  return ''
}

function getDefaultMemoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = pad2(now.getMonth() + 1)
  const d = pad2(now.getDate())
  const hh = pad2(now.getHours())
  const mm = pad2(now.getMinutes())
  return `${y}-${m}-${d}T${hh}:${mm}`
}

function getFileIcon(mime: string, className?: string) {
  if (isImageMime(mime)) return <FileImage className={cn(className)} />
  if (isPdfMime(mime)) return <FileText className={cn(className, 'text-red-500')} />
  return <FileText className={cn(className, 'text-blue-500')} />
}

function parseAttachments(raw: string | null | undefined): CaseMemoAttachment[] {
  if (!raw || String(raw).trim() === '') return []
  try {
    const p = JSON.parse(String(raw))
    if (!Array.isArray(p)) return []
    return p.filter((it): it is CaseMemoAttachment => {
      if (!it || typeof it !== 'object') return false
      return (
        typeof (it as any).name === 'string' &&
        typeof (it as any).type === 'string' &&
        typeof (it as any).data === 'string'
      )
    })
  } catch {
    return []
  }
}

type CasesRemarkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Case
}

export function CasesRemarkDialog({
  open,
  onOpenChange,
  currentRow,
}: CasesRemarkDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>(
    []
  )
  const [previewAttachment, setPreviewAttachment] = useState<PendingAttachment | CaseMemoAttachment | null>(
    null
  )

  const caseId = Number(currentRow?.case_id)
  const memoQueryKey = useMemo(() => ['case-memos', caseId], [caseId])

  const { data: memoList = [], isLoading: memoListLoading } = useQuery({
    queryKey: memoQueryKey,
    queryFn: () => fetchCaseMemosByCaseId(caseId),
    enabled: open && Number.isFinite(caseId) && caseId > 0,
    staleTime: 30000,
  })

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_memo_date: getDefaultMemoDate(),
      case_memo_content: '',
      case_memo_remark: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      case_memo_date: getDefaultMemoDate(),
      case_memo_content: '',
      case_memo_remark: '',
    })
    setPendingAttachments([])
    setPreviewAttachment(null)
  }, [open, caseId, form])

  const mutation = useMutation({
    mutationFn: (payload: {
      case_id: number
      case_memo_date: string
      case_memo_content?: string
      case_memo_remark?: string
      case_memo_attachement?: string
    }) => createCaseMemo(payload),
    onSuccess: (created) => {
      toast.success('案件备注保存成功', {
        description: created?.case_memo_timestamp
          ? `保存时间：${created.case_memo_timestamp}`
          : undefined,
      })
      queryClient.invalidateQueries({ queryKey: memoQueryKey })
      form.reset({
        case_memo_date: getDefaultMemoDate(),
        case_memo_content: '',
        case_memo_remark: '',
      })
      setPendingAttachments([])
    },
    onError: (err: any) => {
      const msg =
        typeof err?.message === 'string' ? err.message : '保存案件备注失败'
      toast.error('保存案件备注失败', { description: msg })
    },
  })

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const items: PendingAttachment[] = []
      const errors: string[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (!f) continue
        if (!isAllowedFileType(f)) {
          errors.push(`${f.name}（格式不支持）`)
          continue
        }
        if (f.size > 20 * 1024 * 1024) {
          errors.push(`${f.name}（超过 20MB）`)
          continue
        }
        try {
          const data = await readFileAsDataURL(f)
          items.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            name: f.name,
            size: f.size,
            type: f.type || guessMimeByName(f.name),
            data,
          })
        } catch (e: any) {
          errors.push(`${f.name}（读取失败：${e?.message ?? '未知错误'}）`)
        }
      }
      if (items.length > 0) {
        setPendingAttachments((prev) => [...prev, ...items])
      }
      if (errors.length > 0) {
        toast.warning('部分附件未添加', { description: errors.join('；') })
      }
    },
    []
  )

  const handleRemovePending = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const onSubmit = useCallback(
    async (values: MemoFormValues) => {
      if (!Number.isFinite(caseId) || caseId <= 0) {
        toast.error('案件编号非法，无法保存备注')
        return
      }
      const attachmentJson =
        pendingAttachments.length > 0
          ? JSON.stringify(
              pendingAttachments.map((x) => ({
                name: x.name,
                size: x.size,
                type: x.type,
                data: x.data,
              }))
            )
          : ''
      await mutation.mutateAsync({
        case_id: caseId,
        case_memo_date: values.case_memo_date
          ? values.case_memo_date.replace('T', ' ')
          : '',
        case_memo_content: values.case_memo_content?.trim() || '',
        case_memo_remark: values.case_memo_remark?.trim() || '',
        case_memo_attachement: attachmentJson || '',
      })
    },
    [caseId, pendingAttachments, mutation]
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex h-[90vh] flex-col gap-4 p-0 sm:max-w-4xl'
          )}
        >
          <DialogHeader className='border-b px-6 py-4'>
            <DialogTitle className='flex items-center gap-2'>
              <StickyNotePlus className='opacity-80' size={18} />
              案件备注
            </DialogTitle>
            <DialogDescription className='flex flex-wrap items-center gap-2'>
              <span className='font-medium text-foreground/80'>
                {currentRow.case_inquiry_keyword ?? '-'}
              </span>
              <span className='text-muted-foreground'>（船名：</span>
              <span className='font-medium text-foreground/80'>
                {currentRow.vessel_name ?? '-'}
              </span>
              <span className='text-muted-foreground'>）</span>
              {currentRow.case_id != null && (
                <Badge variant='outline' className='ms-2 ml-2'>
                  案件 #{String(currentRow.case_id)}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='flex-1 px-6'>
            <div className='flex flex-col gap-6 py-3'>
              <Form {...form}>
                <form
                  id='case-memo-form'
                  onSubmit={form.handleSubmit(onSubmit)}
                  className='flex flex-col gap-4'
                >
                  <FormField
                    control={form.control}
                    name='case_memo_date'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 pt-2 text-end'>
                          备忘录日期
                        </FormLabel>
                        <div className='col-span-10'>
                          <FormControl>
                            <Input
                              type='datetime-local'
                              step={60}
                              className='w-full'
                              value={toDatetimeLocalValue(field.value)}
                              onChange={(e) => {
                                const v = e.target.value
                                field.onChange(v || '')
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='case_memo_content'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 pt-2 text-end'>
                          备忘录内容
                        </FormLabel>
                        <div className='col-span-10'>
                          <FormControl>
                            <Textarea
                              rows={6}
                              placeholder='请输入备忘录内容...'
                              className='w-full resize-y'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='case_memo_remark'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-12 items-start space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 pt-2 text-end'>
                          备忘录备注
                        </FormLabel>
                        <div className='col-span-10'>
                          <FormControl>
                            <Input
                              placeholder='请输入备忘录备注...'
                              className='w-full'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className='grid grid-cols-12 items-start gap-x-4 gap-y-1'>
                    <div className='col-span-2 pt-2 text-end text-sm font-medium'>
                      备忘录附件
                    </div>
                    <div className='col-span-10 flex flex-col gap-3'>
                      <div className='flex flex-wrap items-center gap-3'>
                        <Input
                          ref={fileInputRef}
                          type='file'
                          multiple
                          accept={ACCEPT_FILETYPES}
                          className='hidden'
                          onChange={(e) => {
                            void handleFilesSelected(e.target.files)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                        />
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className='me-2 mr-2 size-4' />
                          选择文件
                        </Button>
                        <span className='text-xs text-muted-foreground'>
                          支持 PDF / 图片 / Word / Excel / PPT / TXT / CSV 等，单文件 ≤ 20MB，可多选
                        </span>
                        {pendingAttachments.length > 0 && (
                          <Badge variant='secondary'>
                            已选 {pendingAttachments.length} 项
                          </Badge>
                        )}
                      </div>

                      {pendingAttachments.length > 0 && (
                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
                          {pendingAttachments.map((att) => (
                            <AttachmentPreviewCard
                              key={att.id}
                              attachment={att}
                              onRemove={() => handleRemovePending(att.id)}
                              onPreview={() => setPreviewAttachment(att)}
                              showRemove
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </Form>

              <Separator className='my-2' />

              <section className='flex flex-col gap-3'>
                <div className='flex items-center justify-between'>
                  <div className='text-sm font-semibold'>历史备注</div>
                  <div className='text-xs text-muted-foreground'>
                    {memoListLoading
                      ? '加载中...'
                      : `共 ${memoList.length} 条备注`}
                  </div>
                </div>
                <div className='flex flex-col gap-3'>
                  {memoList.length === 0 && !memoListLoading ? (
                    <div className='rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
                      暂无历史备注，填写上方表单后点击「保存备注」即可添加。
                    </div>
                  ) : (
                    memoList.map((m) => (
                      <HistoryMemoCard
                        key={m.memo_id}
                        memo={m}
                        onPreviewAttachment={(att) =>
                          setPreviewAttachment(att)
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className='border-t px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
            <Button
              type='submit'
              form='case-memo-form'
              variant='default'
              disabled={mutation.isPending}
            >
              <Save className='me-2 mr-2 size-4' />
              {mutation.isPending ? '保存中...' : '保存备注'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewAttachment && (
        <AttachmentPreviewDialog
          attachment={previewAttachment}
          onOpenChange={(v) => !v && setPreviewAttachment(null)}
        />
      )}
    </>
  )
}

function HistoryMemoCard({
  memo,
  onPreviewAttachment,
}: {
  memo: CaseMemo
  onPreviewAttachment: (att: CaseMemoAttachment) => void
}) {
  const atts = parseAttachments(memo.case_memo_attachement)
  return (
    <article className='rounded-md border bg-card/40 p-4'>
      <header className='flex flex-wrap items-center gap-2'>
        {memo.case_memo_date && (
          <Badge variant='outline' className='bg-muted/30'>
            📅 {memo.case_memo_date.slice(0, 16).replace('T', ' ')}
          </Badge>
        )}
        {memo.case_memo_timestamp && (
          <span className='text-xs text-muted-foreground'>
            保存时间：{String(memo.case_memo_timestamp).slice(0, 19).replace('T', ' ')}
          </span>
        )}
      </header>
      <div className='mt-3 grid grid-cols-12 items-start gap-x-4 gap-y-2'>
        <div className='col-span-12'>
          <div className='mb-1 text-xs font-semibold text-muted-foreground/80'>
            内容
          </div>
          {memo.case_memo_content && String(memo.case_memo_content).trim() ? (
            <LongText className='max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed'>
              {memo.case_memo_content}
            </LongText>
          ) : (
            <div className='text-sm italic text-muted-foreground/70'>
              （无）
            </div>
          )}
        </div>
        {memo.case_memo_remark && String(memo.case_memo_remark).trim() && (
          <div className='col-span-12'>
            <div className='mb-1 text-xs font-semibold text-muted-foreground/80'>
              备注
            </div>
            <div className='text-sm leading-relaxed'>
              {memo.case_memo_remark}
            </div>
          </div>
        )}
        {atts.length > 0 && (
          <div className='col-span-12'>
            <div className='mb-1 text-xs font-semibold text-muted-foreground/80'>
              附件（{atts.length}）
            </div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
              {atts.map((att, idx) => (
                <AttachmentPreviewCard
                  key={`${memo.memo_id}-${idx}`}
                  attachment={att}
                  onPreview={() => onPreviewAttachment(att)}
                  showRemove={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function AttachmentPreviewCard({
  attachment,
  onRemove,
  onPreview,
  showRemove,
}: {
  attachment: { name: string; size: number; type: string; data: string }
  onRemove?: () => void
  onPreview?: () => void
  showRemove?: boolean
}) {
  const imgSrc = isImageMime(attachment.type) ? attachment.data : undefined
  return (
    <div className='group relative flex flex-col overflow-hidden rounded-md border bg-background'>
      <button
        type='button'
        onClick={() => onPreview?.()}
        className='flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/30'
        title={`点击预览 ${attachment.name}`}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={attachment.name}
            className='h-full w-full object-contain transition-transform group-hover:scale-[1.02]'
            loading='lazy'
          />
        ) : (
          <div className='flex flex-col items-center gap-1.5 p-3'>
            {getFileIcon(attachment.type, 'size-8')}
            <div className='max-w-full truncate text-[11px] text-muted-foreground'>
              {attachment.type || guessKindByName(attachment.name)}
            </div>
          </div>
        )}
      </button>
      <div className='flex items-start justify-between gap-1 border-t p-2'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <div
            className='truncate text-xs font-medium'
            title={attachment.name}
          >
            {attachment.name}
          </div>
          <div className='text-[10px] text-muted-foreground'>
            {formatFileSize(attachment.size)}
          </div>
        </div>
        {showRemove && onRemove && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className='-me-0.5 -mt-0.5 rounded-full p-1 text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-600'
            title='移除'
          >
            <Trash2 className='size-3.5' />
          </button>
        )}
      </div>
    </div>
  )
}

function AttachmentPreviewDialog({
  attachment,
  onOpenChange,
}: {
  attachment: { name: string; size: number; type: string; data: string }
  onOpenChange: (open: boolean) => void
}) {
  const imgSrc = isImageMime(attachment.type) ? attachment.data : undefined
  const pdfSrc = isPdfMime(attachment.type) ? attachment.data : undefined
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[90vh] max-w-5xl flex-col gap-0 p-0'>
        <DialogHeader className='flex flex-row items-center justify-between border-b px-6 py-3'>
          <div className='flex items-center gap-2 overflow-hidden'>
            {getFileIcon(attachment.type, 'size-5 shrink-0')}
            <DialogTitle className='truncate text-base'>
              {attachment.name}
            </DialogTitle>
            <Badge variant='outline' className='shrink-0'>
              {formatFileSize(attachment.size)}
            </Badge>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => onOpenChange(false)}
          >
            <X className='size-4' />
          </Button>
        </DialogHeader>
        <div className='flex-1 overflow-hidden bg-muted/20'>
          {imgSrc ? (
            <div className='flex h-full w-full items-center justify-center p-4'>
              <img
                src={imgSrc}
                alt={attachment.name}
                className='max-h-full max-w-full object-contain'
              />
            </div>
          ) : pdfSrc ? (
            <iframe
              title={attachment.name}
              src={pdfSrc}
              className='h-full w-full border-0 bg-white'
            />
          ) : attachment.data?.startsWith('data:') ? (
            <div className='flex h-full flex-col items-center justify-center gap-3 p-6'>
              {getFileIcon(attachment.type, 'size-16 opacity-70')}
              <div className='flex flex-col items-center gap-1 text-center'>
                <div className='text-sm font-medium'>{attachment.name}</div>
                <div className='text-xs text-muted-foreground'>
                  该文件类型暂不支持内联预览
                </div>
              </div>
              <Button
                type='button'
                variant='outline'
                asChild
              >
                <a
                  href={attachment.data}
                  download={attachment.name}
                  target='_blank'
                  rel='noreferrer'
                >
                  在新窗口打开 / 下载
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function guessMimeByName(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return `image/${n.slice(n.lastIndexOf('.') + 1)}`
  if (n.endsWith('.doc')) return 'application/msword'
  if (n.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (n.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (n.endsWith('.ppt')) return 'application/vnd.ms-powerpoint'
  if (n.endsWith('.pptx'))
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (n.endsWith('.txt')) return 'text/plain'
  if (n.endsWith('.csv')) return 'text/csv'
  if (n.endsWith('.rtf')) return 'application/rtf'
  return 'application/octet-stream'
}

function guessKindByName(name: string): string {
  const n = (name || '').toLowerCase()
  const ext = n.slice(n.lastIndexOf('.') + 1).toUpperCase()
  if (n.endsWith('.pdf')) return 'PDF 文档'
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return `${ext} 图片`
  if (/\.(docx?)$/i.test(n)) return 'Word 文档'
  if (/\.(xlsx?)$/i.test(n)) return 'Excel 表格'
  if (/\.(pptx?)$/i.test(n)) return 'PPT 演示文稿'
  if (/\.(txt|csv|rtf)$/i.test(n)) return `${ext} 文本`
  return ext ? `${ext} 文件` : '文件'
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(new Error(reader.error?.message ?? '文件读取失败'))
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') resolve(r)
      else reject(new Error('文件读取失败：非字符串结果'))
    }
    reader.readAsDataURL(file)
  })
}
