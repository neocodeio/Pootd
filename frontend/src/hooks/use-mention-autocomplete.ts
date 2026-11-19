import { useId, useMemo, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { activeMention, applyMention } from '@/lib/mentions'
import type { Profile } from '@/lib/types'
import { useMentionCandidates, useTopProfiles } from './use-pootd'

const MAX_OPTIONS = 6

/**
 * `@mention` typeahead for a textarea.
 *
 * The caller owns the value; this hook only tracks the caret, the active
 * `@fragment`, and the highlighted option. The list is rendered inline (not in
 * a portal) so it never gets clipped by the composer card, and keeps the
 * textarea as the single focus target.
 */
export function useMentionAutocomplete({
  value,
  onChange,
  textareaRef,
}: {
  value: string
  onChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}) {
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState({ key: '', index: 0 })
  const [dismissed, setDismissed] = useState<string | null>(null)
  const listboxId = `mentions-${useId().replace(/:/g, '')}`

  const token = activeMention(value, caret)
  const tokenKey = token ? `${token.start}:${token.query}` : ''
  const candidates = useMentionCandidates(token?.query ?? '')
  // A bare `@` shows the most-followed members instead of an empty list.
  const topProfiles = useTopProfiles(MAX_OPTIONS, Boolean(token && !token.query))

  const options = useMemo(() => {
    if (!token) return []
    if (token.query.length === 0) return topProfiles.data ?? []
    return (candidates.data ?? []).slice(0, MAX_OPTIONS)
  }, [token, candidates.data, topProfiles.data])

  const open = Boolean(token && tokenKey !== dismissed && options.length > 0)

  // A new fragment always starts from the top of the list, without an effect.
  const maxIndex = Math.max(0, options.length - 1)
  const activeIndex =
    active.key === tokenKey ? Math.min(active.index, maxIndex) : 0

  function setActiveIndex(index: number) {
    setActive({ key: tokenKey, index })
  }

  function select(profile: Profile) {
    if (!token) return

    const next = applyMention(value, token, profile.username)
    onChange(next.value)
    setDismissed(null)
    setCaret(next.caret)

    // The value is applied on the next frame; put the caret after it then.
    requestAnimationFrame(() => {
      const element = textareaRef.current
      if (!element) return
      element.focus()
      element.setSelectionRange(next.caret, next.caret)
    })
  }

  function dismiss() {
    if (tokenKey) setDismissed(tokenKey)
  }

  function syncCaret() {
    const element = textareaRef.current
    if (element) setCaret(element.selectionStart)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open) return false

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((activeIndex + step + options.length) % options.length)
      return true
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      const option = options[Math.min(activeIndex, options.length - 1)]
      if (!option) return false
      event.preventDefault()
      select(option)
      return true
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      dismiss()
      return true
    }

    return false
  }

  return {
    open,
    options,
    activeIndex,
    listboxId,
    setActiveIndex,
    handleKeyDown,
    syncCaret,
    dismiss,
    select,
    /** Spread onto the textarea so screen readers read it as a combobox. */
    controlProps: {
      role: 'combobox' as const,
      'aria-autocomplete': 'list' as const,
      'aria-expanded': open,
      'aria-controls': open ? listboxId : undefined,
      'aria-activedescendant': open ? `${listboxId}-${activeIndex}` : undefined,
    },
  }
}
