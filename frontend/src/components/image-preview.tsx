import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function ImagePreview({
  open,
  onOpenChange,
  src,
  alt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-[calc(100vw-2rem)] gap-0 bg-background p-2 sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
        />
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-3 end-3 bg-background/90 text-foreground shadow-sm hover:bg-background"
            aria-label="إغلاق المعاينة"
          >
            <X />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
