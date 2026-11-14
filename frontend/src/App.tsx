import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { AppShell } from '@/components/layout/app-shell'
import { RequireAuth } from '@/components/require-auth'
import { Toaster } from '@/components/ui/sonner'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SetupPage } from '@/pages/setup'

const FeedPage = lazy(() =>
  import('@/pages/feed').then((module) => ({ default: module.FeedPage })),
)
const ExplorePage = lazy(() =>
  import('@/pages/explore').then((module) => ({ default: module.ExplorePage })),
)
const TagPage = lazy(() =>
  import('@/pages/tag').then((module) => ({ default: module.TagPage })),
)
const PostPage = lazy(() =>
  import('@/pages/post').then((module) => ({ default: module.PostPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/profile').then((module) => ({ default: module.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings').then((module) => ({ default: module.SettingsPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/login').then((module) => ({ default: module.LoginPage })),
)
const SignupPage = lazy(() =>
  import('@/pages/signup').then((module) => ({ default: module.SignupPage })),
)
const VerifyPage = lazy(() =>
  import('@/pages/verify').then((module) => ({ default: module.VerifyPage })),
)
const SearchPage = lazy(() =>
  import('@/pages/search').then((module) => ({ default: module.SearchPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((module) => ({ default: module.NotFoundPage })),
)

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

function FullPageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-foreground" />
        جارٍ التحميل…
      </div>
    </div>
  )
}

export default function App() {
  const { resolvedTheme } = useTheme()

  if (!isSupabaseConfigured) {
    return (
      <BrowserRouter>
        <SetupPage />
        <Toaster theme={resolvedTheme} position="bottom-center" />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<FullPageFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<FeedPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="tags/:tag" element={<TagPage />} />
              <Route path="p/:id" element={<PostPage />} />
              <Route path="u/:username" element={<ProfilePage />} />
              <Route
                path="settings"
                element={
                  <RequireAuth>
                    <SettingsPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify" element={<VerifyPage />} />
          </Routes>
        </Suspense>
        <Toaster theme={resolvedTheme} position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  )
}
