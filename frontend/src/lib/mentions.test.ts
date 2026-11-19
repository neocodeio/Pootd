import { describe, expect, it } from 'vitest'
import { activeMention, applyMention } from './mentions'

describe('activeMention', () => {
  it('finds the token at the end of the text', () => {
    expect(activeMention('مرحبا @am', 9)).toEqual({
      query: 'am',
      start: 6,
      end: 9,
    })
  })

  it('opens on a bare @', () => {
    expect(activeMention('@', 1)).toEqual({ query: '', start: 0, end: 1 })
  })

  it('ignores e-mail addresses', () => {
    expect(activeMention('name@example.com', 16)).toBeNull()
    expect(activeMention('name@exa', 9)).toBeNull()
  })

  it('requires a boundary before the @', () => {
    expect(activeMention('hi@amin', 8)).toBeNull()
    expect(activeMention('مرحبا @amin', 11)).toEqual({
      query: 'amin',
      start: 6,
      end: 11,
    })
  })

  it('stops at a space after the token', () => {
    expect(activeMention('@amin ', 6)).toBeNull()
  })

  it('rejects characters outside a username', () => {
    expect(activeMention('@amin-', 6)).toBeNull()
    expect(activeMention('@أمين', 5)).toBeNull()
  })

  it('clamps a caret outside the value', () => {
    expect(activeMention('@am', 99)).toEqual({ query: 'am', start: 0, end: 3 })
    expect(activeMention('@am', -3)).toBeNull()
  })
})

describe('applyMention', () => {
  it('replaces the fragment and keeps the caret after a space', () => {
    const token = activeMention('مرحبا @am', 9)!
    expect(applyMention('مرحبا @am', token, 'amin')).toEqual({
      value: 'مرحبا @amin ',
      caret: 12,
    })
  })

  it('keeps the rest of the text', () => {
    const value = '@am تابع القراءة'
    const token = activeMention(value, 3)!
    expect(applyMention(value, token, 'amin')).toEqual({
      value: '@amin تابع القراءة',
      caret: 5,
    })
  })

  it('does not double the space', () => {
    const value = '@am نكمل'
    const token = activeMention(value, 3)!
    expect(applyMention(value, token, 'amin').value).toBe('@amin نكمل')
  })
})
