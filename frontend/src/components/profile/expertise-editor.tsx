import { useState } from 'react'
import {
  Award01Icon,
  Cancel01Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EMPTY_CERTIFICATION,
  MAX_CERTIFICATIONS,
  MAX_CERTIFICATION_ISSUER,
  MAX_CERTIFICATION_TITLE,
  MAX_EXPERTISE_LABEL_LENGTH,
  MAX_EXPERTISE_LABELS,
  normalizeDigits,
} from '@/lib/expertise'
import type { Certification } from '@/lib/types'

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Chip editor for one expertise list (skills or tools). Enter or a comma adds
 * the draft, backspace on an empty field removes the last chip, and the limit
 * mirrors `0020_profile_expertise.sql`.
 */
export function LabelListEditor({
  id,
  label,
  icon,
  placeholder,
  values,
  onChange,
}: {
  id: string
  label: string
  icon: IconSvgElement
  placeholder: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState('')
  const atCapacity = values.length >= MAX_EXPERTISE_LABELS

  function add() {
    const label = cleanLabel(draft)
    if (!label) return

    if ([...label].length > MAX_EXPERTISE_LABEL_LENGTH) {
      setNote(`كل عنصر لازم يكون ${MAX_EXPERTISE_LABEL_LENGTH} حرفًا أو أقل.`)
      return
    }
    if (values.some((value) => value.toLowerCase() === label.toLowerCase())) {
      setNote(`«${label}» موجود مسبقًا.`)
      return
    }
    if (atCapacity) {
      setNote(`الحد الأقصى ${MAX_EXPERTISE_LABELS} عناصر.`)
      return
    }

    onChange([...values, label])
    setDraft('')
    setNote('')
  }

  function remove(index: number) {
    onChange(values.filter((_, position) => position !== index))
    setNote('')
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="inline-flex items-center gap-1.5">
          <HugeiconsIcon
            icon={icon}
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          {label}
        </Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {values.length}/{MAX_EXPERTISE_LABELS}
        </span>
      </div>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <li
              key={value}
              className="inline-flex max-w-full items-center gap-1 break-words rounded-full border border-border bg-secondary/40 py-1 ps-3 pe-1 text-sm leading-6"
            >
              <span dir="auto">{value}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`حذف ${value}`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setNote('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
              event.preventDefault()
              add()
              return
            }
            if (event.key === 'Backspace' && !draft && values.length > 0) {
              event.preventDefault()
              remove(values.length - 1)
            }
          }}
          placeholder={placeholder}
          maxLength={MAX_EXPERTISE_LABEL_LENGTH}
          dir="auto"
          autoComplete="off"
          disabled={atCapacity}
          className="h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={!draft.trim() || atCapacity}
        >
          <HugeiconsIcon icon={PlusSignIcon} />
          إضافة
        </Button>
      </div>

      {note ? (
        <p role="alert" className="text-xs text-destructive">
          {note}
        </p>
      ) : null}
    </div>
  )
}

/** Row editor for certifications and achievements (six at most). */
export function CertificationsEditor({
  rows,
  onChange,
}: {
  rows: Certification[]
  onChange: (rows: Certification[]) => void
}) {
  function update(index: number, patch: Partial<Certification>) {
    onChange(
      rows.map((row, position) =>
        position === index ? { ...row, ...patch } : row,
      ),
    )
  }

  function remove(index: number) {
    onChange(rows.filter((_, position) => position !== index))
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <Label>الشهادات والإنجازات</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {rows.length}/{MAX_CERTIFICATIONS}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-secondary/20 p-2.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                  aria-hidden="true"
                >
                  <HugeiconsIcon icon={Award01Icon} className="size-4" />
                </span>
                <p className="text-sm font-medium">
                  الشهادة أو الإنجاز {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  aria-label={`حذف الشهادة أو الإنجاز ${index + 1}`}
                  className="ms-auto rounded-full text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
              </div>

              <div className="mt-2 grid gap-2">
                <Input
                  value={row.title}
                  onChange={(event) => update(index, { title: event.target.value })}
                  placeholder="اسم الشهادة أو الإنجاز"
                  aria-label={`اسم الشهادة ${index + 1}`}
                  maxLength={MAX_CERTIFICATION_TITLE}
                  dir="auto"
                  className="h-9"
                />
                <div className="grid gap-2 sm:grid-cols-[1fr_6.5rem]">
                  <Input
                    value={row.issuer}
                    onChange={(event) => update(index, { issuer: event.target.value })}
                    placeholder="جهة الإصدار (اختياري)"
                    aria-label={`جهة إصدار الشهادة ${index + 1}`}
                    maxLength={MAX_CERTIFICATION_ISSUER}
                    dir="auto"
                    className="h-9"
                  />
                  <Input
                    value={row.year}
                    onChange={(event) =>
                      update(index, {
                        year: normalizeDigits(event.target.value)
                          .replace(/\D/g, '')
                          .slice(0, 4),
                      })
                    }
                    placeholder="السنة"
                    aria-label={`سنة الشهادة ${index + 1}`}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    dir="ltr"
                    autoComplete="off"
                    className="h-9 text-start"
                  />
                </div>
                <Input
                  value={row.url}
                  onChange={(event) => update(index, { url: event.target.value })}
                  placeholder="رابط الشهادة (اختياري)"
                  aria-label={`رابط الشهادة ${index + 1}`}
                  inputMode="url"
                  dir="ltr"
                  autoComplete="off"
                  className="h-9 text-start"
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, { ...EMPTY_CERTIFICATION }])}
          disabled={rows.length >= MAX_CERTIFICATIONS}
        >
          <HugeiconsIcon icon={PlusSignIcon} />
          إضافة شهادة
        </Button>
        <span className="text-xs text-muted-foreground">
          حتى {MAX_CERTIFICATIONS}، وتظهر مع رابطها في ملفك.
        </span>
      </div>
    </div>
  )
}
