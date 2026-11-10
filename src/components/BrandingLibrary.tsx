import { useMemo, useState } from 'react'
import { ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { BrandProfile, BrandShot, BrandShotKind } from '../types'
import { analyzeBrandShots } from '../lib/brandAnalysis'
import { uploadBrandImage } from '../lib/storage'

type BrandFilter = 'people' | BrandShotKind

const FILTERS: { id: BrandFilter; label: string }[] = [
  { id: 'people', label: '사람' },
  { id: 'profile', label: '프로필' },
  { id: 'bio', label: '바이오' },
  { id: 'editing', label: '편집 스타일' },
  { id: 'other', label: '기타' },
]

const KIND_LABEL: Record<BrandShotKind, string> = {
  profile: '프로필',
  bio: '바이오',
  editing: '편집 스타일',
  other: '기타',
}

interface BrandingLibraryProps {
  profiles: BrandProfile[]
  shots: BrandShot[]
  loading: boolean
  error: string | null
  onAddProfile: (input: { name: string; handle?: string }) => Promise<BrandProfile | null>
  onUpdateProfile: (
    id: string,
    patch: Partial<Pick<BrandProfile, 'name' | 'handle' | 'notes' | 'analysis'>>,
  ) => Promise<BrandProfile | null>
  onArchiveProfile: (id: string) => Promise<boolean>
  onAddShot: (input: {
    profile_id: string
    kind: BrandShotKind
    image_url: string
  }) => Promise<BrandShot | null>
  onDeleteShot: (id: string) => Promise<boolean>
}

export function BrandingLibrary({
  profiles,
  shots,
  loading,
  error,
  onAddProfile,
  onUpdateProfile,
  onArchiveProfile,
  onAddShot,
  onDeleteShot,
}: BrandingLibraryProps) {
  const [filter, setFilter] = useState<BrandFilter>('people')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [openKind, setOpenKind] = useState<BrandShotKind>('editing')

  const shotsByProfile = useMemo(() => {
    const map = new Map<string, BrandShot[]>()
    for (const shot of shots) {
      const list = map.get(shot.profile_id) ?? []
      list.push(shot)
      map.set(shot.profile_id, list)
    }
    return map
  }, [shots])

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  )

  const visibleShots =
    filter === 'people' ? [] : shots.filter((shot) => shot.kind === filter)

  const openProfile = profiles.find((profile) => profile.id === openId) ?? null

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed || adding) return
    setAdding(true)
    const created = await onAddProfile({ name: trimmed, handle })
    setAdding(false)
    if (!created) return
    setName('')
    setHandle('')
    setOpenKind('editing')
    setOpenId(created.id)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            브랜딩
          </h2>
          <p className="mt-1 text-[13px] text-[#8e8e93]">
            바이오, 프로필, 편집 습관을 사람별로 모아 두고 스타일만 골라 비교합니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-white p-3 shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd()
          }}
          placeholder="사람 이름"
          className="min-w-[140px] flex-1 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] text-[#1d1d1f] outline-none ring-1 ring-transparent placeholder:text-[#b0b0b5] focus:bg-white focus:ring-[#b49ba1]/40"
        />
        <input
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd()
          }}
          placeholder="@아이디"
          className="w-36 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-[13px] text-[#1d1d1f] outline-none ring-1 ring-transparent placeholder:text-[#b0b0b5] focus:bg-white focus:ring-[#b49ba1]/40"
        />
        <button
          type="button"
          disabled={adding || !name.trim()}
          onClick={() => void handleAdd()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d1d1f] px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          추가
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const count =
            item.id === 'people'
              ? profiles.length
              : shots.filter((shot) => shot.kind === item.id).length
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                active
                  ? 'bg-[#1d1d1f] text-white'
                  : 'bg-white text-[#5d5d62] ring-1 ring-black/[0.06] hover:bg-[#f7f7f8]'
              }`}
            >
              {item.label}
              <span className={active ? 'ml-1.5 text-white/70' : 'ml-1.5 text-[#b0b0b5]'}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="rounded-2xl bg-[#fff4f5] px-4 py-3 text-[12px] text-[#a45462]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-[#8e8e93]">불러오는 중</p>
      ) : filter === 'people' ? (
        profiles.length === 0 ? (
          <EmptyCopy text="사람을 추가한 뒤, 프로필·바이오·편집 스크린샷을 붙여 넣으세요." />
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => (
              <PersonCard
                key={profile.id}
                profile={profile}
                shots={shotsByProfile.get(profile.id) ?? []}
                onOpen={(kind) => {
                  setOpenKind(kind)
                  setOpenId(profile.id)
                }}
              />
            ))}
          </div>
        )
      ) : visibleShots.length === 0 ? (
        <EmptyCopy
          text={`${KIND_LABEL[filter]} 스크린샷이 아직 없어요. 사람을 열고 이미지를 붙여 넣으세요.`}
        />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {visibleShots.map((shot) => {
            const owner = profileById.get(shot.profile_id)
            if (!owner) return null
            return (
              <button
                key={shot.id}
                type="button"
                onClick={() => {
                  setOpenKind(shot.kind)
                  setOpenId(owner.id)
                }}
                className="mb-4 block w-full break-inside-avoid overflow-hidden rounded-[24px] bg-white text-left shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04]"
              >
                <img src={shot.image_url} alt="" className="block h-auto w-full bg-[#f3f3f5]" />
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">
                    {owner.name}
                  </p>
                  {owner.handle && (
                    <p className="truncate text-[11px] text-[#8e8e93]">@{owner.handle}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openProfile && (
        <PersonModal
          key={openProfile.id}
          profile={openProfile}
          shots={shotsByProfile.get(openProfile.id) ?? []}
          kind={openKind}
          onKind={setOpenKind}
          onClose={() => setOpenId(null)}
          onUpdate={onUpdateProfile}
          onArchive={async () => {
            const ok = await onArchiveProfile(openProfile.id)
            if (ok) setOpenId(null)
          }}
          onAddShot={onAddShot}
          onDeleteShot={onDeleteShot}
        />
      )}
    </section>
  )
}

function EmptyCopy({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/[0.08] bg-white px-6 py-16 text-center text-[13px] text-[#8e8e93]">
      {text}
    </div>
  )
}

function PersonCard({
  profile,
  shots,
  onOpen,
}: {
  profile: BrandProfile
  shots: BrandShot[]
  onOpen: (kind: BrandShotKind) => void
}) {
  const preview = shots.slice(0, 3)
  return (
    <article className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-sm)] ring-1 ring-black/[0.04]">
      <button
        type="button"
        onClick={() => onOpen(preview[0]?.kind ?? 'editing')}
        className="block w-full text-left"
      >
        {preview.length > 0 ? (
          <div className={`grid ${preview.length > 1 ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {preview.map((shot) => (
              <img
                key={shot.id}
                src={shot.image_url}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center bg-[#f6f6f8] text-[12px] text-[#a0a0a5]">
            스크린샷을 붙여 넣으세요
          </div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-[16px] font-semibold text-[#1d1d1f]">
              {profile.name}
            </h3>
            {profile.handle && (
              <span className="truncate text-[12px] text-[#8e8e93]">@{profile.handle}</span>
            )}
          </div>
          {profile.analysis?.pattern && (
            <p className="line-clamp-2 text-[12px] leading-5 text-[#5c4d53]">
              {profile.analysis.pattern}
            </p>
          )}
        </div>
      </button>
      <div className="flex flex-wrap gap-1.5 px-4 pb-4">
        {(Object.keys(KIND_LABEL) as BrandShotKind[]).map((kind) => {
          const count = shots.filter((shot) => shot.kind === kind).length
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onOpen(kind)}
              className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] font-medium text-[#5d5d62]"
            >
              {KIND_LABEL[kind]} {count}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function PersonModal({
  profile,
  shots,
  kind,
  onKind,
  onClose,
  onUpdate,
  onArchive,
  onAddShot,
  onDeleteShot,
}: {
  profile: BrandProfile
  shots: BrandShot[]
  kind: BrandShotKind
  onKind: (kind: BrandShotKind) => void
  onClose: () => void
  onUpdate: BrandingLibraryProps['onUpdateProfile']
  onArchive: () => Promise<void>
  onAddShot: BrandingLibraryProps['onAddShot']
  onDeleteShot: BrandingLibraryProps['onDeleteShot']
}) {
  const [name, setName] = useState(profile.name)
  const [handle, setHandle] = useState(profile.handle ?? '')
  const [notes, setNotes] = useState(profile.notes ?? '')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const visible = shots.filter((shot) => shot.kind === kind)

  async function saveDetails() {
    await onUpdate(profile.id, {
      name: name.trim() || profile.name,
      handle,
      notes,
    })
  }

  async function addFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length === 0) {
      setLocalError('이미지 파일만 붙여 넣을 수 있어요.')
      return
    }
    setUploading(true)
    setLocalError(null)
    for (const file of images) {
      const url = await uploadBrandImage(file)
      if (!url) {
        setLocalError('이미지를 올리지 못했어요.')
        continue
      }
      await onAddShot({ profile_id: profile.id, kind, image_url: url })
    }
    setUploading(false)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setLocalError(null)
    try {
      const analysis = await analyzeBrandShots(profile.name, profile.handle, shots)
      await onUpdate(profile.id, { analysis })
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : '분석하지 못했어요.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-[#f7f7f9] shadow-2xl"
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.items)
            .filter((item) => item.type.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file))
          if (files.length === 0) return
          event.preventDefault()
          void addFiles(files)
        }}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/85 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[12px] font-medium text-[#86868b]">브랜딩</p>
            <h2 className="text-[20px] font-semibold tracking-tight text-[#1d1d1f]">
              {profile.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f2f4] p-2 text-[#6e6e73]"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => void saveDetails()}
              className="rounded-2xl bg-white px-4 py-3 text-[14px] outline-none ring-1 ring-black/[0.05]"
            />
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              onBlur={() => void saveDetails()}
              placeholder="@아이디"
              className="rounded-2xl bg-white px-4 py-3 text-[14px] outline-none ring-1 ring-black/[0.05]"
            />
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => void saveDetails()}
            placeholder="이 사람한테서 가져오고 싶은 점"
            rows={2}
            className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-[14px] outline-none ring-1 ring-black/[0.05]"
          />

          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND_LABEL) as BrandShotKind[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onKind(item)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  kind === item
                    ? 'bg-[#1d1d1f] text-white'
                    : 'bg-white text-[#5d5d62] ring-1 ring-black/[0.06]'
                }`}
              >
                {KIND_LABEL[item]}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-black/[0.1] bg-white px-4 py-8 text-center">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#8e8e93]" />
            ) : (
              <ImagePlus className="h-5 w-5 text-[#8e8e93]" />
            )}
            <p className="mt-2 text-[13px] font-medium text-[#3a3a3c]">
              {KIND_LABEL[kind]} 이미지를 붙여 넣거나 올려 주세요
            </p>
            <p className="mt-1 text-[11px] text-[#a0a0a5]">여러 장도 한 번에 넣을 수 있어요</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                void addFiles(files)
              }}
            />
          </label>

          {visible.length > 0 && (
            <div className="columns-2 gap-3">
              {visible.map((shot) => (
                <div
                  key={shot.id}
                  className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]"
                >
                  <img src={shot.image_url} alt="" className="block h-auto w-full" />
                  <button
                    type="button"
                    onClick={() => void onDeleteShot(shot.id)}
                    className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="스크린샷 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[24px] bg-white p-4 ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f]">분석</p>
                <p className="mt-0.5 text-[11px] text-[#8e8e93]">
                  올린 화면을 보고 프로필, 바이오, 편집 패턴을 정리합니다.
                </p>
              </div>
              <button
                type="button"
                disabled={analyzing || shots.length === 0}
                onClick={() => void handleAnalyze()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                {analyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                분석하기
              </button>
            </div>
            {profile.analysis && (
              <div className="mt-3 space-y-2 text-[12px] leading-5 text-[#3a3a3c]">
                {profile.analysis.pattern && (
                  <p className="font-semibold">{profile.analysis.pattern}</p>
                )}
                {profile.analysis.profile && <p>프로필 · {profile.analysis.profile}</p>}
                {profile.analysis.bio && <p>바이오 · {profile.analysis.bio}</p>}
                {profile.analysis.editing && <p>편집 · {profile.analysis.editing}</p>}
                {profile.analysis.takeaway && (
                  <p className="text-[#6e6e73]">가져올 점 · {profile.analysis.takeaway}</p>
                )}
              </div>
            )}
          </div>

          {localError && <p className="text-[12px] text-[#a45462]">{localError}</p>}

          <button
            type="button"
            onClick={() => void onArchive()}
            className="text-[12px] font-medium text-[#b7737e]"
          >
            이 사람 삭제
          </button>
        </div>
      </div>
    </div>
  )
}
