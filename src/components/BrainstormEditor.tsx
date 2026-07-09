import { useEffect, useRef } from 'react'
import { uploadIdeaImage } from '../lib/storage'

interface BrainstormEditorProps {
  value: string
  onChange: (html: string) => void
}

export function BrainstormEditor({ value, onChange }: BrainstormEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const uploading = useRef(false)
  const lastExternal = useRef<string | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (value !== lastExternal.current) {
      ref.current.innerHTML = value || ''
      lastExternal.current = value
    }
  }, [value])

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file || uploading.current) return

    uploading.current = true
    const url = await uploadIdeaImage(file)
    uploading.current = false
    if (!url || !ref.current) return

    const img = document.createElement('img')
    img.src = url
    img.alt = '붙여넣은 이미지'
    img.className = 'brainstorm-image'

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(img)
      range.setStartAfter(img)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      ref.current.appendChild(img)
    }

    const html = ref.current.innerHTML
    lastExternal.current = html
    onChange(html)
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        if (!ref.current) return
        const html = ref.current.innerHTML
        lastExternal.current = html
        onChange(html)
      }}
      onPaste={(e) => void handlePaste(e)}
      data-placeholder="브레인스토밍… 이미지는 Ctrl/Cmd+V로 붙여넣기"
      className="brainstorm-editor min-h-40 w-full rounded-xl border border-transparent bg-[#f5f5f7] px-4 py-3 text-[15px] leading-relaxed text-[#1d1d1f] outline-none transition-all duration-200 focus:border-[#d2d2d7] focus:bg-white focus:shadow-[var(--shadow-sm)]"
    />
  )
}
