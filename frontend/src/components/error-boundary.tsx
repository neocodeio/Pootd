import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Alert02Icon, Refresh01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render errors so one broken screen never leaves a blank page. The
 * fallback keeps the product's monochrome language and offers the only action
 * that reliably recovers: a full reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[pootd] render error:', error, info.componentStack)
  }

  reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <HugeiconsIcon icon={Alert02Icon} className="size-5" />
          </span>
          <h1 className="mt-4 font-heading text-lg font-semibold">
            صار خطأ غير متوقع
          </h1>
          <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
            أعد تحميل الصفحة، وإذا تكرر الخطأ جرّبها بعد شوي.
          </p>
          <Button type="button" className="mt-4 rounded-full" onClick={this.reload}>
            <HugeiconsIcon icon={Refresh01Icon} />
            أعد تحميل الصفحة
          </Button>
        </div>
      </div>
    )
  }
}
