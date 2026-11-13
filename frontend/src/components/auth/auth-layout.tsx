import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card } from '@/components/ui/card'

const currentYear = new Date().getFullYear()

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-4" />
            الرئيسية
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-20 pt-4">
        <div className="w-full max-w-sm">
          <Card className="p-6 sm:p-8">{children}</Card>
        </div>
      </main>

      <footer className="px-4 pb-8 text-center text-xs text-muted-foreground">
        © {currentYear} بوتد
      </footer>
    </div>
  )
}
