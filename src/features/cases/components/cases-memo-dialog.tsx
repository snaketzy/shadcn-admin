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
  Pencil as PencilIcon,
  Download as DownloadIcon,
  ExternalLink as ExternalLinkIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/date-picker'
import {
  createCaseMemo,
  deleteCaseMemo,
  updateCaseMemo,
  fetchCaseMemoListByCaseId,
  parseAttachments,
  type CaseMemo,
  type CaseMemoAttachment,
} from '../api/client'
import type { Case } from '../data/schema'

type CasesMemoDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  currentRow: Case
  editingMemo?: CaseMemo | null
  onEditingMemoChange?: (memo: CaseMemo | null) => void
  mode?: 'dialog' | 'page'
  onCancel?: () => void
  onSuccess?: () => void
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatNowForStorage(now: Date): string {
  const y = now.getFullYear()
  const m = pad2(now.getMonth() + 1)
  const d = pad2(now.getDate())
  const hh = pad2(now.getHours())
  const mm = pad2(now.getMinutes())
  return `${y}-${m}-${d} ${hh}:${mm}`
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

function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
const TEXT_EXTS = ['txt', 'csv', 'md']
const PDF_EXT = 'pdf'

function isImageExt(name: string): boolean {
  return IMAGE_EXTS.includes(getExt(name))
}
function isTextExt(name: string): boolean {
  return TEXT_EXTS.includes(getExt(name))
}
function isPdfExt(name: string): boolean {
  return getExt(name) === PDF_EXT
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

function dataUrlFromAttachment(att: CaseMemoAttachment): string {
  if (att.data) return att.data
  return ''
}

function triggerDownload(att: CaseMemoAttachment) {
  const url = dataUrlFromAttachment(att)
  if (!url) {
    toast.warning('该附件未包含文件内容，无法下载')
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = att.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function openInNewTab(att: CaseMemoAttachment) {
  const url = dataUrlFromAttachment(att)
  if (!url) {
    toast.warning('该附件未包含文件内容，无法预览')
    return
  }
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) w.focus()
}

export function CasesMemoDialog({
  open = true,
  onOpenChange,
  currentRow,
  editingMemo = null,
  onEditingMemoChange,
  mode = 'dialog',
  onCancel,
  onSuccess,
}: CasesMemoDialogProps) {
  const queryClient = useQueryClient()
  const [memoDate, setMemoDate] = useState<string>('')
  const [memoContent, setMemoContent] = useState<string>('')
  const [memoRemark, setMemoRemark] = useState<string>('')
  const [attachments, setAttachments] = useState<CaseMemoAttachment[]>([])
  const [previewAtt, setPreviewAtt] = useState<CaseMemoAttachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isEditMode = Boolean(editingMemo)
  const editingMemoId = editingMemo?.case_memo_id ?? null

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
    enabled: mode === 'page' || (open && caseNo > 0),
    staleTime: 60_000,
  })

  const safeStr = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v).trim()
    if (s === 'null' || s === 'undefined') return ''
    return s
  }

  useEffect(() => {
    const isActive = mode === 'page' || open
    if (isActive) {
      if (editingMemo) {
        const rawDate = safeStr(editingMemo.case_memo_date).replace('T', ' ')
        const d = new Date(rawDate.replace(' ', 'T'))
        if (rawDate && !Number.isNaN(d.getTime())) {
          const [datePart, timePart] = rawDate.split(' ')
          setMemoDate(
            timePart
              ? `${datePart} ${timePart.slice(0, 5)}`
              : `${datePart} 00:00`
          )
        } else {
          setMemoDate(formatNowForStorage(new Date()))
        }
        setMemoContent(safeStr(editingMemo.case_memo_content))
        setMemoRemark(safeStr(editingMemo.case_memo_remark))
        setAttachments(parseAttachments(editingMemo.case_memo_attachment))
      } else {
        if (!memoDate) {
          setMemoDate(formatNowForStorage(new Date()))
        }
        setMemoContent('')
        setMemoRemark('')
        setAttachments([])
      }
    } else {
      if (!editingMemo) {
        setMemoContent('')
        setMemoRemark('')
        setAttachments([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === 'page' || open, editingMemo])

  const saveModeRef = useRef<'close' | 'new' | null>(null)

  const clearForm = () => {
    setMemoContent('')
    setMemoRemark('')
    setAttachments([])
    setMemoDate(formatNowForStorage(new Date()))
    onEditingMemoChange?.(null)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createCaseMemo({
        case_id: caseNo,
        case_memo_date: memoDate || null,
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
        const modeSave = saveModeRef.current
        saveModeRef.current = null
        if (modeSave === 'close') {
          toast.success('备忘已保存')
          if (mode === 'page') {
            onSuccess?.()
          } else {
            onOpenChange?.(false)
          }
        } else if (modeSave === 'new') {
          toast.success('备忘已保存，可继续新增')
          clearForm()
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

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCaseMemo(editingMemoId!, {
        case_memo_date: memoDate || null,
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
        saveModeRef.current = null
        toast.success('备忘已更新')
        clearForm()
        if (mode === 'page') {
          onSuccess?.()
        } else {
          onOpenChange?.(false)
        }
      } else {
        saveModeRef.current = null
        toast.error('更新失败，请稍后重试')
      }
    },
    onError: (err: Error) => {
      saveModeRef.current = null
      toast.error(`更新失败: ${err.message}`)
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const canSave =
    !isSaving &&
    (memoContent.trim().length > 0 ||
      memoRemark.trim().length > 0 ||
      attachments.length > 0)

  const handleSave = () => {
    if (!canSave) return
    saveModeRef.current = 'close'
    if (isEditMode && editingMemoId) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const handleSaveAndNew = () => {
    if (!canSave) return
    if (isEditMode) {
      saveModeRef.current = 'close'
      updateMutation.mutate()
      return
    }
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

  const handleAttachmentsPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const accepted: CaseMemoAttachment[] = []
    const rejected: string[] = []
    const toRead: Array<{ f: File; a: CaseMemoAttachment }> = []
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
      const a: CaseMemoAttachment = {
        name: f.name,
        size: f.size,
        type: f.type || undefined,
      }
      accepted.push(a)
      toRead.push({ f, a })
    }
    if (toRead.length > 0) {
      try {
        await Promise.all(
          toRead.map(async ({ f, a }) => {
            try {
              a.data = await readFileAsDataURL(f)
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
      {isEditMode ? (
        <PencilIcon className='me-1 inline h-5 w-5 text-primary' />
      ) : (
        <StickyNoteIcon className='me-1 inline h-5 w-5 text-primary' />
      )}
      <span className='font-semibold'>
        {isEditMode ? '编辑案件备忘' : '案件备忘'}
      </span>
      {isEditMode && editingMemoId && (
        <Badge
          variant='outline'
          className='rounded-full border-border bg-transparent'
        >
          #{editingMemoId}
        </Badge>
      )}
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

  const handleClose = () => {
    clearForm()
    if (mode === 'page') {
      onCancel?.()
    } else {
      onOpenChange?.(false)
    }
  }

  const renderBody = () => (
    <>
      <Separator className='-mx-6 w-[calc(100%+3rem)] shrink-0' />

      <div className='min-h-0 w-[calc(100%+0.75rem)] flex-1 overflow-y-auto py-5 pe-3'>
        <div className='grid grid-cols-[150px_1fr] items-start gap-x-6 gap-y-5'>
          <Label className='pt-2 text-sm font-semibold text-foreground/90'>
            备忘日期
          </Label>
          <div>
            <DateTimePicker value={memoDate} onChange={setMemoDate} />
          </div>

          <Label className='pt-2 text-sm font-semibold text-foreground/90'>
            备忘内容
          </Label>
          <div className='flex flex-col gap-1.5'>
            <p className='text-xs text-muted-foreground/80'>
              支持 Markdown
              格式：**加粗**、*斜体*、[链接](url)、列表、表格、代码块等
            </p>
            <Textarea
              value={memoContent}
              onChange={(e) => setMemoContent(e.target.value)}
              placeholder={
                '## 标题\n\n- **要点1**：说明\n- *要点2*：说明\n\n`行内代码` 或 ``` 代码块'
              }
              rows={6}
              className='min-h-[160px] resize-y font-mono text-[13px] leading-6'
            />
          </div>

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
                    className='h-8 cursor-pointer gap-1 rounded-full px-3 py-0 text-xs font-normal transition-colors hover:bg-secondary/80'
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewAtt(a)
                    }}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }}
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
                    isEditing={isEditMode && editingMemoId === m.case_memo_id}
                    onEdit={() => {
                      onEditingMemoChange?.(m)
                    }}
                    onDelete={() => {
                      if (
                        window.confirm('确定要删除该条备注吗？该操作不可恢复。')
                      ) {
                        deleteMutation.mutate(m.case_memo_id)
                      }
                    }}
                    onPreviewAttachment={(att) => setPreviewAtt(att)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className='-mx-6 w-[calc(100%+3rem)] shrink-0' />
      <div className='mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 pt-4'>
        {isEditMode && (
          <Button
            type='button'
            variant='ghost'
            onClick={() => onEditingMemoChange?.(null)}
            className='h-10 px-5'
          >
            取消编辑
          </Button>
        )}
        <Button
          variant='outline'
          type='button'
          className='h-10 px-5'
          onClick={handleClose}
        >
          关闭
        </Button>
        {!isEditMode && (
          <Button
            type='button'
            variant='secondary'
            onClick={handleSaveAndNew}
            disabled={!canSave || isSaving}
            className='h-10 gap-2 px-5'
          >
            <PlusIcon size={16} />
            {isSaving ? '保存中...' : '保存并新增备忘'}
          </Button>
        )}
        <Button
          type='button'
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className='h-10 gap-2 px-5'
        >
          <SaveIcon size={16} />
          {isSaving ? '保存中...' : isEditMode ? '更新备忘' : '保存备忘'}
        </Button>
      </div>
    </>
  )

  return (
    <>
      {mode === 'page' ? (
        <div className='mx-auto flex h-[90vh] max-h-[90vh] w-full flex-col overflow-hidden p-6 sm:max-w-4xl'>
          <div className='mb-2 shrink-0 text-start'>
            <div className='text-xl leading-7 font-semibold'>{caseTitle}</div>
            {caseHeaderMeta}
          </div>
          {renderBody()}
        </div>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(state) => {
            if (!state) {
              clearForm()
            }
            onOpenChange?.(state)
          }}
        >
          <DialogContent
            showCloseButton={true}
            className='flex h-[90vh] max-h-[90vh] flex-col overflow-hidden p-6 sm:max-w-4xl'
          >
            <DialogHeader className='shrink-0 text-start'>
              <DialogTitle className='text-xl leading-7'>
                {caseTitle}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                案件备忘：添加与查看历史备忘
              </DialogDescription>
              {caseHeaderMeta}
            </DialogHeader>
            {renderBody()}
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={previewAtt !== null}
        onOpenChange={(s) => {
          if (!s) setPreviewAtt(null)
        }}
      >
        <DialogContent
          showCloseButton={true}
          className='flex h-[90vh] max-h-[90vh] w-[92vw] flex-col overflow-hidden p-0 sm:max-w-5xl'
        >
          {previewAtt && (
            <>
              <DialogHeader className='shrink-0 flex-row items-center justify-between gap-3 border-b px-6 py-4 text-start'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <DialogTitle className='flex flex-wrap items-center gap-2 text-base leading-6'>
                    {isImageExt(previewAtt.name) ? (
                      <ImageIcon size={18} className='text-primary' />
                    ) : (
                      <FileTextIcon size={18} className='text-primary' />
                    )}
                    <span className='break-all'>{previewAtt.name}</span>
                  </DialogTitle>
                  <DialogDescription className='text-xs'>
                    {previewAtt.size != null && formatBytes(previewAtt.size)}
                    {previewAtt.type && (
                      <>
                        <span className='mx-1.5 opacity-40'>·</span>
                        <span className='font-mono'>{previewAtt.type}</span>
                      </>
                    )}
                  </DialogDescription>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 gap-1.5'
                    onClick={() => triggerDownload(previewAtt)}
                  >
                    <DownloadIcon size={15} />
                    <span>下载</span>
                  </Button>
                  {(isPdfExt(previewAtt.name) ||
                    isImageExt(previewAtt.name) ||
                    isTextExt(previewAtt.name)) && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-9 gap-1.5'
                      onClick={() => openInNewTab(previewAtt)}
                    >
                      <ExternalLinkIcon size={15} />
                      <span>新标签页</span>
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <AttachmentPreviewBody att={previewAtt} />
              <DialogFooter className='shrink-0 border-t px-6 py-3'>
                <DialogClose asChild>
                  <Button variant='outline' size='sm' className='h-9'>
                    关闭
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function AttachmentPreviewBody({ att }: { att: CaseMemoAttachment }) {
  const url = dataUrlFromAttachment(att)
  const ext = getExt(att.name)

  if (!url) {
    return (
      <div className='flex flex-1 items-center justify-center p-10'>
        <Card className='w-full max-w-md border-dashed shadow-none'>
          <CardContent className='space-y-3 py-8 text-center'>
            <FileTextIcon
              size={36}
              className='mx-auto text-muted-foreground/70'
            />
            <div className='text-sm font-medium text-foreground/90'>
              暂无预览内容
            </div>
            <div className='text-xs text-muted-foreground'>
              该附件由旧数据导入，未包含文件内容，无法在线预览。
              <br />
              请在编辑时重新上传以启用预览。
            </div>
            <div className='pt-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-9 gap-1.5'
                onClick={() => triggerDownload(att)}
              >
                <DownloadIcon size={15} />
                <span>尝试下载</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isImageExt(att.name)) {
    return (
      <ScrollArea className='min-h-0 flex-1'>
        <div className='flex min-h-full items-start justify-center bg-muted/20 p-6'>
          <img
            src={url}
            alt={att.name}
            className='h-auto max-w-full rounded-md border border-border/60 bg-white shadow-sm'
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </ScrollArea>
    )
  }

  if (isTextExt(att.name)) {
    const [text, setText] = useState<string>('')
    useEffect(() => {
      let cancelled = false
      const run = async () => {
        try {
          const resp = await fetch(url)
          const t = await resp.text()
          if (!cancelled) setText(t)
        } catch {
          if (!cancelled) setText('')
        }
      }
      void run()
      return () => {
        cancelled = true
      }
    }, [url])
    return (
      <ScrollArea className='min-h-0 flex-1'>
        <pre className='min-h-full bg-muted/20 p-6 font-mono text-[13px] leading-6 break-words whitespace-pre-wrap text-foreground/90'>
          {text || '（加载中...）'}
        </pre>
      </ScrollArea>
    )
  }

  if (isPdfExt(att.name)) {
    return (
      <div className='min-h-0 flex-1 bg-muted/20 p-3'>
        <iframe
          src={url}
          title={att.name}
          className='h-full w-full rounded-md border border-border/60 bg-white'
        />
      </div>
    )
  }

  return (
    <div className='flex flex-1 items-center justify-center p-10'>
      <Card className='w-full max-w-md border-dashed shadow-none'>
        <CardContent className='space-y-3 py-8 text-center'>
          <FileTextIcon
            size={36}
            className='mx-auto text-muted-foreground/70'
          />
          <div className='text-sm font-medium text-foreground/90'>
            .{ext.toUpperCase()} 文件不支持在线预览
          </div>
          <div className='text-xs text-muted-foreground'>
            该类型需要 Office / WPS 等本地软件打开，请先下载。
          </div>
          <div className='pt-2'>
            <Button
              size='sm'
              className='h-9 gap-1.5'
              onClick={() => triggerDownload(att)}
            >
              <DownloadIcon size={15} />
              <span>下载附件</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MemoHistoryItem({
  memo,
  isDeleting,
  isEditing,
  onEdit,
  onDelete,
  onPreviewAttachment,
}: {
  memo: CaseMemo
  isDeleting: boolean
  isEditing?: boolean
  onEdit?: () => void
  onDelete: () => void
  onPreviewAttachment?: (att: CaseMemoAttachment) => void
}) {
  const atts = useMemo(
    () => parseAttachments(memo.case_memo_attachment),
    [memo.case_memo_attachment]
  )
  const safeStr = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v).trim()
    if (s === 'null' || s === 'undefined') return ''
    return s
  }

  const contentStr = safeStr(memo.case_memo_content)
  const remarkStr = safeStr(memo.case_memo_remark)
  const hasAttachments = atts.length > 0
  const hasContent = contentStr.length > 0
  const hasRemark = remarkStr.length > 0

  const mdWithSoftBreaks = useMemo(() => {
    if (!hasContent) return ''
    const parts = contentStr.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    return parts
      .map((part) => {
        if (/^```/.test(part) || /^~~~/.test(part)) return part
        return part.replace(/(?<=\S)[ \t]*\n(?!\s*\n|$)/g, '  \n')
      })
      .join('')
  }, [contentStr, hasContent])

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/80 shadow-none transition-colors',
        isEditing && 'border-primary ring-2 ring-primary/60'
      )}
    >
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
            {isEditing && (
              <Badge
                variant='secondary'
                className='rounded-full px-2 py-0 text-[11px] font-medium'
              >
                编辑中
              </Badge>
            )}
          </CardTitle>
          <CardDescription className='text-xs'>
            创建于 {formatDisplayDate(memo.created_at)}
            {memo.updated_at && memo.updated_at !== memo.created_at && (
              <> ｜ 编辑于 {formatDisplayDate(memo.updated_at)}</>
            )}
          </CardDescription>
        </div>
        <div className='flex items-center gap-0.5'>
          {onEdit && (
            <Button
              variant='ghost'
              size='icon'
              className={cn(
                'h-8 w-8 hover:bg-primary/10',
                isEditing
                  ? 'text-primary hover:text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={onEdit}
              disabled={isDeleting}
              aria-label='编辑该备忘'
            >
              <PencilIcon size={16} />
            </Button>
          )}
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
        </div>
      </CardHeader>
      {(hasContent || hasRemark || hasAttachments) && (
        <CardContent className='space-y-3 pt-0'>
          {hasContent && (
            <div className='markdown-prose text-sm text-foreground/90 [&_a]:text-primary [&_a]:underline [&_a]:decoration-current/40 [&_a]:underline-offset-2 [&_a:hover]:decoration-current [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:rounded-sm [&_code]:bg-muted/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mt-4 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_li]:my-0.5 [&_li]:marker:text-muted-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_p]:leading-7 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-3 [&_th]:py-1.5 [&_th]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {mdWithSoftBreaks}
              </ReactMarkdown>
            </div>
          )}
          {hasRemark && (
            <div className='rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
              <span className='me-2 font-medium text-foreground/80'>
                备注：
              </span>
              {remarkStr}
            </div>
          )}
          {hasAttachments && (
            <div className='flex flex-wrap gap-2'>
              {atts.map((a, i) => (
                <Badge
                  key={`${a.name}-${i}`}
                  variant='secondary'
                  className={cn(
                    'gap-1 rounded-full px-2.5 py-0.5 text-xs font-normal transition-colors',
                    onPreviewAttachment &&
                      'cursor-pointer hover:bg-secondary/80'
                  )}
                  onClick={() => onPreviewAttachment?.(a)}
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
