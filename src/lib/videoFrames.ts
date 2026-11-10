import type { GeminiImagePayload } from './gemini'

function waitFor(
  target: HTMLVideoElement,
  event: keyof HTMLMediaElementEventMap,
  timeoutMs = 8000,
) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('영상 프레임을 읽지 못했어요.'))
    }, timeoutMs)
    const onEvent = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('영상을 열 수 없어요.'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      target.removeEventListener(event, onEvent)
      target.removeEventListener('error', onError)
    }
    target.addEventListener(event, onEvent)
    target.addEventListener('error', onError)
  })
}

function frameTimes(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0.3) return [0]
  const end = Math.max(0, duration - 0.12)
  return [...new Set([0.12, duration * 0.16, duration * 0.42, end])].map(
    (time) => Math.min(Math.max(time, 0), end),
  )
}

async function framesFromVideo(url: string): Promise<GeminiImagePayload[]> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  await waitFor(video, 'loadedmetadata')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('프레임을 만들지 못했어요.')

  const frames: GeminiImagePayload[] = []
  for (const time of frameTimes(video.duration)) {
    if (Math.abs(video.currentTime - time) > 0.05) {
      video.currentTime = time
      await waitFor(video, 'seeked')
    }
    const width = video.videoWidth || 720
    const height = video.videoHeight || 1280
    const scale = Math.min(1, 720 / width)
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', 0.68).split(',')[1]
    if (data) frames.push({ mime_type: 'image/jpeg', data })
  }
  video.src = ''
  return frames
}

export async function captureVideoFrames(
  source: File | string,
): Promise<GeminiImagePayload[]> {
  if (typeof source !== 'string') {
    const url = URL.createObjectURL(source)
    try {
      return await framesFromVideo(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error('저장된 영상을 불러오지 못했어요. 파일을 다시 올려 주세요.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  try {
    return await framesFromVideo(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function imageSourceToPayload(
  source: File | string,
): Promise<GeminiImagePayload> {
  const blob =
    typeof source === 'string'
      ? await fetch(source).then((response) => {
          if (!response.ok) throw new Error('이미지를 불러오지 못했어요.')
          return response.blob()
        })
      : source
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const encoded = result.split(',')[1]
      if (!encoded) reject(new Error('이미지를 읽지 못했어요.'))
      else resolve(encoded)
    }
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'))
    reader.readAsDataURL(blob)
  })
  return { mime_type: blob.type || 'image/jpeg', data }
}
