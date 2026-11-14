import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getProfileById } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.error(error)
        setSession(data.session)
      })
      .catch((error: unknown) => {
        console.error(error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id

  useEffect(() => {
    let active = true

    if (!userId) return

    void getProfileById(userId)
      .then((nextProfile) => {
        if (active) setProfile(nextProfile)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setProfile(null)
      })

    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      setProfile(await getProfileById(userId))
    } catch (error) {
      console.error(error)
      setProfile(null)
    }
  }, [userId])

  const activeProfile = profile?.id === userId ? profile : null

  // TEMP-DEMO: preview the signed-in layout without credentials (removed after screenshots)
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('demo')
  ) {
    const demoProfile: Profile = {
      id: '8fbcb9c7-3c28-4166-8283-8e2a7f6b6785',
      username: 'amin',
      display_name: 'أمين',
      bio: '',
      avatar_url:
        'https://reoauwvpuhxbtdipadhw.supabase.co/storage/v1/object/public/avatars/8fbcb9c7-3c28-4166-8283-8e2a7f6b6785/avatar?v=1794519963161',
      cover_image_url: '',
      website: '',
      github: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return (
      <AuthContext.Provider
        value={{
          session: null,
          user: { id: demoProfile.id } as unknown as User,
          profile: demoProfile,
          loading: false,
          refreshProfile: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: activeProfile,
      loading,
      refreshProfile,
    }),
    [session, activeProfile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
