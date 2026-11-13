import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/use-theme'
import type { ThemePreference } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'فاتح', icon: <Sun className="size-4" /> },
  { value: 'dark', label: 'داكن', icon: <Moon className="size-4" /> },
  { value: 'system', label: 'حسب النظام', icon: <Monitor className="size-4" /> },
]

export function ThemeOptions() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
              active
                ? 'border-foreground/20 bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
