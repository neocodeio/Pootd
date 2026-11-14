import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeTag, TAG_REGEX } from '@/lib/validation'

export function TagInput({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}) {
  const [value, setValue] = useState('')

  function commit() {
    const tag = normalizeTag(value)
    if (!tag) return false

    if (!TAG_REGEX.test(tag)) {
      toast.error('الوسوم من 1 إلى 24 حرفًا: a–z و0–9 والشرطة.')
      return false
    }
    if (tags.includes(tag)) {
      setValue('')
      return true
    }
    if (tags.length >= 5) {
      toast.error('تقدر تضيف 5 وسوم كحد أقصى.')
      return false
    }

    onAdd(tag)
    setValue('')
    return true
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground"
        >
          <span dir="ltr">#{tag}</span>
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`إزالة وسم ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {tags.length < 5 ? (
        <div className="flex min-w-[100px] flex-1 items-center gap-1">
          <span className="text-sm text-muted-foreground/70">#</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                commit()
              } else if (event.key === 'Backspace' && value === '' && tags.length > 0) {
                onRemove(tags[tags.length - 1])
              }
            }}
            onBlur={() => {
              if (value.trim()) commit()
            }}
            aria-label="إضافة وسم"
            placeholder={tags.length === 0 ? 'أضف وسومًا' : ''}
            dir="auto"
            className="w-full bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            maxLength={25}
          />
        </div>
      ) : null}
    </div>
  )
}
