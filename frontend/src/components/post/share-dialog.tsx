import { useState } from 'react'
import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  Share08Icon,
} from '@hugeicons/core-free-icons'
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
import {
  buildShareTargets,
  buildShareText,
  buildShareTitle,
  shareExcerpt,
} from '@/lib/share'
import type { PostWithAuthor } from '@/lib/types'

/**
 * Share sheet for one post: platform intents (X, Telegram, Reddit), a
 * copy-link row, and the native share sheet when the browser exposes it.
 *
 * Layout is a fixed header + scrollable body + fixed footer column, so the
 * dialog always stays inside the viewport and only the middle section scrolls
 * on very short screens. All targets are monochrome icons so the dialog stays
 * inside the product's visual language.
 */
export function ShareDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: PostWithAuthor
}) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/p/${post.id}`
  const targets = buildShareTargets(post, url)
  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  function handleOpenChange(next: boolean) {
    if (!next) setCopied(false)
    onOpenChange(next)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('تم نسخ الرابط')
    } catch {
      toast.error('تعذّر نسخ الرابط.')
    }
  }

  function openTarget(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer')
    handleOpenChange(false)
  }

  async function shareNatively() {
    try {
      await navigator.share({
        title: buildShareTitle(post),
        text: buildShareText(post),
        url,
      })
      handleOpenChange(false)
    } catch (error) {
      if ((error as DOMException | undefined)?.name !== 'AbortError') {
        toast.error('تعذّرت المشاركة من الجهاز.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-0 overflow-hidden border border-border p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1 px-4 pb-3 pe-12 pt-4">
          <DialogTitle className="text-[15px]">مشاركة المنشور</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            شارك المنشور على منصتك، أو انسخ رابطه.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
          <div className="rounded-xl border border-border bg-secondary/25 p-2.5">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span
                dir="auto"
                className="truncate text-[11px] font-medium text-foreground"
              >
                {post.author.display_name}
              </span>
              <span
                dir="ltr"
                className="shrink-0 truncate text-[10px] text-muted-foreground"
              >
                @{post.author.username}
              </span>
            </div>
            <p
              dir="auto"
              className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-foreground/80"
            >
              {shareExcerpt(post.content, 140)}
            </p>
          </div>

          <div
            className="grid grid-cols-3 gap-1.5"
            role="group"
            aria-label="منصات المشاركة"
          >
            {targets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => openTarget(target.href)}
                aria-label={`مشاركة على ${target.label}`}
                className="group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors group-hover:border-foreground/25">
                  <HugeiconsIcon
                    icon={target.icon}
                    className="size-4"
                    aria-hidden="true"
                  />
                </span>
                <span className="max-w-full truncate leading-4">
                  {target.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1.5 ps-3">
            <span
              dir="ltr"
              className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
            >
              {url}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void copyLink()}
              className="shrink-0"
              aria-label="نسخ رابط المنشور"
            >
              <HugeiconsIcon
                icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              />
            </Button>
          </div>
        </div>

        <DialogFooter className="mx-0 my-0 shrink-0 flex-row justify-end gap-2 rounded-b-xl border-t border-border bg-muted/50 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            إغلاق
          </Button>
          {supportsNativeShare ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void shareNatively()}
            >
              <HugeiconsIcon icon={Share08Icon} />
              مشاركة
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
