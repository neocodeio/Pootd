import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  id?: string
  length?: number
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  className?: string
}

/**
 * One box per digit. Typing advances to the next box, backspace clears and
 * walks backwards, arrow keys move between boxes, and a pasted or autofilled
 * code is spread across the boxes. Give it a new `key` to clear the boxes.
 */
export function OtpInput({
  id = 'otp',
  length = 4,
  onChange,
  disabled = false,
  autoFocus = false,
  invalid = false,
  className,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, () => ''),
  )
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const wasDisabled = useRef(disabled)

  // Focus is lost while the form is submitting (the boxes are disabled), so
  // put the caret back in the first empty box when they come back.
  useEffect(() => {
    const wasDisabledBefore = wasDisabled.current
    wasDisabled.current = disabled
    if (!wasDisabledBefore || disabled) return

    const firstEmpty = digits.findIndex((digit) => !digit)
    const target = firstEmpty < 0 ? 0 : Math.min(firstEmpty, length - 1)
    inputsRef.current[target]?.focus()
  }, [disabled, digits, length])

  function focusAt(index: number) {
    const target = Math.max(0, Math.min(index, length - 1))
    inputsRef.current[target]?.focus()
  }

  function commit(next: string[]) {
    setDigits(next)
    onChange(next.join(''))
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '')
    const next = [...digits]

    if (!cleaned) {
      next[index] = ''
      commit(next)
      return
    }

    // A full code can arrive in one change event through autofill.
    let cursor = cleaned.length >= length ? 0 : index

    if (cleaned.length > 1 && cleaned.length < length) {
      // A keystroke that landed next to the existing digit: keep the new one.
      next[index] = cleaned.slice(-1)
      commit(next)
      focusAt(index + 1)
      return
    }

    for (const digit of cleaned) {
      if (cursor >= length) break
      next[cursor] = digit
      cursor += 1
    }

    commit(next)
    focusAt(cursor)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = [...digits]

      if (next[index]) {
        next[index] = ''
        commit(next)
        return
      }

      if (index > 0) {
        next[index - 1] = ''
        commit(next)
        focusAt(index - 1)
      }
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      const next = [...digits]
      next[index] = ''
      commit(next)
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusAt(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    const cleaned = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!cleaned) return

    event.preventDefault()
    const next = [...digits]
    let cursor = cleaned.length >= length ? 0 : index

    for (const digit of cleaned) {
      if (cursor >= length) break
      next[cursor] = digit
      cursor += 1
    }

    commit(next)
    focusAt(cursor)
  }

  return (
    <div
      role="group"
      aria-label="رمز التحقق"
      dir="ltr"
      className={cn('flex items-center justify-center gap-2.5', className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node
          }}
          id={index === 0 ? id : `${id}-${index}`}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          onFocus={(event) => event.currentTarget.select()}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`الرقم ${index + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className={cn(
            'h-14 w-11 rounded-xl border bg-card text-center font-mono text-2xl font-medium text-foreground caret-foreground outline-none transition-colors',
            'focus-visible:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/30',
            'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50',
            digit ? 'border-foreground/30 bg-secondary' : 'border-input',
            invalid && 'border-destructive/60 aria-invalid:border-destructive',
          )}
        />
      ))}
    </div>
  )
}
