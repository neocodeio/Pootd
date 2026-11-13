import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight">
        ضاعت الصفحة.
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
        يمكن الرابط قديم، أو الصفحة انتقلت مكان ثاني.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">العودة للرئيسية</Link>
      </Button>
    </div>
  )
}
