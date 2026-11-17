import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { PostContent } from './post-content'

function renderContent(content: string) {
  return render(
    <MemoryRouter>
      <PostContent content={content} />
    </MemoryRouter>,
  )
}

describe('PostContent', () => {
  it('links Latin hashtags to their tag page', () => {
    renderContent('هجوم #hacking اليوم')
    const link = screen.getByRole('link', { name: '#hacking' })
    expect(link.getAttribute('href')).toBe('/tags/hacking')
  })

  it('highlights Arabic hashtags without linking them', () => {
    renderContent('#أمن مهم')
    expect(screen.queryByRole('link', { name: '#أمن' })).toBeNull()
    expect(screen.getByText('#أمن').className).toContain('text-tag')
  })

  it('turns raw URLs into safe external links', () => {
    renderContent('راجع https://example.com/report الآن')
    const link = screen.getByRole('link', {
      name: 'https://example.com/report',
    })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('nofollow')
  })

  it('keeps plain text selectable with no stretched link', () => {
    const { container } = renderContent('نص عادي بدون وسوم')
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.textContent).toBe('نص عادي بدون وسوم')
  })
})
