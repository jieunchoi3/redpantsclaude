import { useCallback, useEffect, useState } from 'react'
import type { BrandProfile, BrandShot, BrandShotKind } from '../types'
import {
  createBrandProfile,
  createBrandShot,
  deleteBrandShot,
  fetchBranding,
  updateBrandProfile,
} from '../lib/branding'

export function useBranding() {
  const [profiles, setProfiles] = useState<BrandProfile[]>([])
  const [shots, setShots] = useState<BrandShot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const data = await fetchBranding()
    const ids = new Set(data.profiles.map((profile) => profile.id))
    setProfiles(data.profiles)
    setShots(data.shots.filter((shot) => ids.has(shot.profile_id)))
    setError(data.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function addProfile(input: { name: string; handle?: string }) {
    const result = await createBrandProfile(input)
    if (result.profile) setProfiles((prev) => [result.profile!, ...prev])
    if (result.error) setError(result.error)
    return result.profile
  }

  async function patchProfile(
    id: string,
    patch: Partial<Pick<BrandProfile, 'name' | 'handle' | 'notes' | 'analysis'>>,
  ) {
    const result = await updateBrandProfile(id, patch)
    if (result.profile) {
      setProfiles((prev) =>
        prev.map((profile) => (profile.id === id ? result.profile! : profile)),
      )
    }
    if (result.error) setError(result.error)
    return result.profile
  }

  async function archiveProfile(id: string) {
    const result = await updateBrandProfile(id, { archived: true })
    if (result.profile) {
      setProfiles((prev) => prev.filter((profile) => profile.id !== id))
      setShots((prev) => prev.filter((shot) => shot.profile_id !== id))
    }
    if (result.error) setError(result.error)
    return Boolean(result.profile)
  }

  async function addShot(input: {
    profile_id: string
    kind: BrandShotKind
    image_url: string
  }) {
    const result = await createBrandShot(input)
    if (result.shot) setShots((prev) => [result.shot!, ...prev])
    if (result.error) setError(result.error)
    return result.shot
  }

  async function removeShot(id: string) {
    const message = await deleteBrandShot(id)
    if (!message) setShots((prev) => prev.filter((shot) => shot.id !== id))
    else setError(message)
    return !message
  }

  return {
    profiles,
    shots,
    loading,
    error,
    addProfile,
    patchProfile,
    archiveProfile,
    addShot,
    removeShot,
  }
}
