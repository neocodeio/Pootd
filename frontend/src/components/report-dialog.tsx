import { useState } from 'react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateReport } from '@/hooks/use-mutations'
import type { ReportReason } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_DETAILS_LENGTH = 500

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'إزعاج أو تكرار' },
  { value: 'harassment', label: 'مضايقة أو كراهية' },
  { value: 'malicious_link', label: 'رابط خبيث أو مختصر' },
  { value: 'other', label: 'سبب آخر' },
]

/**
 * Report action for a post or a comment. Members can file one report per item;
 * review happens in the Supabase dashboard.
 */
export function ReportDialog({
  open,
  onOpenChange,
  postId,
  commentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId?: string
  commentId?: string
}) {
  const createReport = useCreateReport()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('spam')
      setDetails('')
    }
    onOpenChange(next)
  }

  function submit() {
    createReport.mutate(
      { postId, commentId, reason, details },
      {
        onSuccess: () => {
          handleOpenChange(false)
          toast.success('تم إرسال البلاغ. شكرًا لك.')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن المحتوى</DialogTitle>
          <DialogDescription className="leading-relaxed">
            اختر السبب الأقرب. البلاغ يصل لفريق الإشراف فقط.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="سبب البلاغ">
            {REASONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={reason === option.value}
                onClick={() => setReason(option.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  reason === option.value
                    ? 'border-foreground/30 bg-secondary text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="report-details">تفاصيل إضافية (اختياري)</Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {details.length}/{MAX_DETAILS_LENGTH}
              </span>
            </div>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={MAX_DETAILS_LENGTH}
              dir="auto"
              placeholder="ايش المشكلة في هذا المحتوى؟"
              className="min-h-20 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={createReport.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={createReport.isPending}
          >
            {createReport.isPending ? (
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
            ) : null}
            إرسال البلاغ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
