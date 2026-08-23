import * as path from 'path'
import COS from 'cos-nodejs-sdk-v5'
import * as fs from 'fs'
import * as os from 'os'

let cosClient: COS | null = null
let cosConfig: {
  SecretId: string
  SecretKey: string
  Bucket: string
  Region: string
  Host: string
} | null = null

function sanitizePathSegment(segment: string | null | undefined): string {
  if (!segment) return 'unknown'
  let s = String(segment).trim()
  if (!s) return 'unknown'
  s = s.replace(/[\\/:*?"<>|]/g, '_')
  s = s.replace(/\s+/g, '_')
  s = s.replace(/\.+/g, '.')
  s = s.replace(/^_+|_+$/g, '')
  return s || 'unknown'
}

function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return `file_${Date.now()}`
  let name = String(filename).trim()
  if (!name) return `file_${Date.now()}`
  const lastDot = name.lastIndexOf('.')
  let base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext = lastDot > 0 ? name.slice(lastDot) : ''
  base = base.replace(/[\\/:*?"<>|]/g, '_')
  base = base.replace(/\s+/g, '_')
  base = base.replace(/\.+/g, '.')
  base = base.replace(/^_+|_+$/g, '')
  if (!base) base = `file_${Date.now()}`
  return base + ext
}

export function getCosConfig(): {
  SecretId: string
  SecretKey: string
  Bucket: string
  Region: string
  Host: string
} | null {
  if (cosConfig) return cosConfig
  const host = process.env.HOST || ''
  const secretId = process.env.SecretId || ''
  const secretKey = process.env.SecretKey || ''
  if (!host || !secretId || !secretKey) {
    console.warn('[COS] Missing config: HOST, SecretId, SecretKey required')
    return null
  }
  const hostParts = host.split('.')
  let bucket = ''
  let region = ''
  if (hostParts.length >= 4) {
    bucket = hostParts[0]
    const match = host.match(/cos\.([^.]+)\.myqcloud\.com/)
    if (match) region = match[1]
  }
  if (!bucket || !region) {
    console.warn('[COS] Cannot parse Bucket/Region from HOST:', host)
    return null
  }
  cosConfig = {
    SecretId: secretId,
    SecretKey: secretKey,
    Bucket: bucket,
    Region: region,
    Host: host,
  }
  return cosConfig
}

export function getCosClient(): COS | null {
  if (cosClient) return cosClient
  const cfg = getCosConfig()
  if (!cfg) return null
  try {
    cosClient = new COS({
      SecretId: cfg.SecretId,
      SecretKey: cfg.SecretKey,
    })
    return cosClient
  } catch (err) {
    console.error('[COS] Failed to init COS client:', err)
    return null
  }
}

export interface UploadToCosParams {
  fileBuffer: Buffer
  filename: string
  contentType?: string
  vesselName?: string | null
  inquiryKeyword?: string | null
  inquiryDate?: string | null
  settlementDate?: string | null
}

export interface UploadToCosResult {
  success: boolean
  url?: string
  key?: string
  message?: string
}

export async function uploadInquiryAttachmentToCos(
  params: UploadToCosParams
): Promise<UploadToCosResult> {
  const cos = getCosClient()
  const cfg = getCosConfig()
  if (!cos || !cfg) {
    return { success: false, message: 'COS服务未配置' }
  }
  const vesselSeg = sanitizePathSegment(params.vesselName)
  const keywordSeg = sanitizePathSegment(params.inquiryKeyword)
  const dateSeg = sanitizePathSegment(params.inquiryDate)
  const keywordDateSeg = keywordSeg + '@' + dateSeg
  const safeFilename = sanitizeFilename(params.filename)
  const timestamp = Date.now()
  const finalFilename = timestamp + '_' + safeFilename
  const key = `jiehong/cases/${vesselSeg}/${keywordDateSeg}/attachments/${finalFilename}`
  const PUBLIC_DOMAIN = 'http://www.jvecloud.com'
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos_upload_'))
    const tmpPath = path.join(tmpDir, finalFilename)
    fs.writeFileSync(tmpPath, params.fileBuffer)
    const inlineDisposition = `inline; filename*=UTF-8''${encodeURIComponent(params.filename || safeFilename)}`
    const result = await cos.putObject({
      Bucket: cfg.Bucket,
      Region: cfg.Region,
      Key: key,
      Body: fs.createReadStream(tmpPath),
      ContentLength: params.fileBuffer.length,
      ContentType: params.contentType || 'application/octet-stream',
      Headers: {
        'Content-Disposition': inlineDisposition,
      },
    })
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      /* ignore cleanup errors */
    }
    if (result && result.statusCode === 200) {
      const url = `${PUBLIC_DOMAIN}/${key}`
      return { success: true, url, key }
    }
    return {
      success: false,
      message: result ? `HTTP ${result.statusCode}` : '上传失败',
    }
  } catch (err: any) {
    console.error('[COS] Upload failed:', err)
    return { success: false, message: err?.message || String(err) }
  }
}

export async function uploadSettlementAttachmentToCos(
  params: UploadToCosParams
): Promise<UploadToCosResult> {
  const cos = getCosClient()
  const cfg = getCosConfig()
  if (!cos || !cfg) {
    return { success: false, message: 'COS服务未配置' }
  }
  const vesselSeg = sanitizePathSegment(params.vesselName)
  const keywordSeg = sanitizePathSegment(params.inquiryKeyword)
  const inquirySeg = sanitizePathSegment(params.inquiryDate)
  const keywordInquirySeg = keywordSeg + '@' + inquirySeg
  const safeFilename = sanitizeFilename(params.filename)
  const timestamp = Date.now()
  const finalFilename = timestamp + '_' + safeFilename
  const key = `jiehong/cases/${vesselSeg}/${keywordInquirySeg}/settlements/${finalFilename}`
  const PUBLIC_DOMAIN = 'http://www.jvecloud.com'
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos_upload_'))
    const tmpPath = path.join(tmpDir, finalFilename)
    fs.writeFileSync(tmpPath, params.fileBuffer)
    const inlineDisposition = `inline; filename*=UTF-8''${encodeURIComponent(params.filename || safeFilename)}`
    const result = await cos.putObject({
      Bucket: cfg.Bucket,
      Region: cfg.Region,
      Key: key,
      Body: fs.createReadStream(tmpPath),
      ContentLength: params.fileBuffer.length,
      ContentType: params.contentType || 'application/octet-stream',
      Headers: {
        'Content-Disposition': inlineDisposition,
      },
    })
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      /* ignore cleanup errors */
    }
    if (result && result.statusCode === 200) {
      const url = `${PUBLIC_DOMAIN}/${key}`
      return { success: true, url, key }
    }
    return {
      success: false,
      message: result ? `HTTP ${result.statusCode}` : '上传失败',
    }
  } catch (err: any) {
    console.error('[COS] Settlement upload failed:', err)
    return { success: false, message: err?.message || String(err) }
  }
}

export interface DeleteFromCosResult {
  success: boolean
  deleted?: boolean
  message?: string
}

export async function deleteFromCos(key: string): Promise<DeleteFromCosResult> {
  const cos = getCosClient()
  const cfg = getCosConfig()
  if (!cos || !cfg) {
    return { success: false, message: 'COS服务未配置' }
  }
  if (!key || typeof key !== 'string' || !key.trim()) {
    return { success: false, message: '缺少文件 key' }
  }
  const cleanKey = key.trim()
  try {
    const result = await cos.deleteObject({
      Bucket: cfg.Bucket,
      Region: cfg.Region,
      Key: cleanKey,
    })
    const code =
      result && typeof result === 'object' && 'statusCode' in result
        ? Number((result as Record<string, unknown>).statusCode)
        : undefined
    if (code === 200 || code === 204) {
      return { success: true, deleted: true }
    }
    return {
      success: false,
      deleted: false,
      message: result ? `HTTP ${code}` : '删除失败',
    }
  } catch (err: unknown) {
    const rec = err as Record<string, unknown> | null | undefined
    const statusCode =
      rec && typeof rec.statusCode === 'number' ? rec.statusCode : undefined
    if (statusCode === 404) {
      return { success: true, deleted: false, message: '文件不存在' }
    }
    void rec
    return {
      success: false,
      message:
        rec && typeof rec.message === 'string' ? rec.message : String(err),
    }
  }
}

export async function deleteFromCosByUrl(
  url: string
): Promise<DeleteFromCosResult> {
  if (!url) return { success: false, message: '缺少 URL' }
  const cfg = getCosConfig()
  let key = ''
  try {
    const u = new URL(url)
    key = u.pathname.replace(/^\//, '')
  } catch {
    const m1 = url.match(/^https?:\/\/[^/]+\/(.+)$/)
    if (m1) key = m1[1]
  }
  if (!key) {
    if (cfg && url.startsWith(`http://www.jvecloud.com/`)) {
      key = url.slice(`http://www.jvecloud.com/`.length)
    } else if (cfg && url.startsWith(`http://${cfg.Host}/`)) {
      key = url.slice(`http://${cfg.Host}/`.length)
    } else if (cfg && url.startsWith(`https://${cfg.Host}/`)) {
      key = url.slice(`https://${cfg.Host}/`.length)
    }
  }
  if (!key) return { success: false, message: '无法从 URL 中解析文件 key' }
  return deleteFromCos(decodeURIComponent(key))
}
