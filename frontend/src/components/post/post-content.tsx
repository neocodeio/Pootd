import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HASHTAG_REGEX, TAG_REGEX } from '@/lib/validation'
import { cn } from '@/lib/utils'

const linkClass = 'text-tag transition-opacity hover:opacity-80'

const URL_SOURCE = String.raw`https?:\/\/[^\s<>"']+|www\.[^\s<>"']+`
const TOKEN_REGEX = new RegExp(`(${URL_SOURCE})|(${HASHTAG_REGEX.source})`, 'gu')
const TRAILING_PUNCTUATION = /[.,;:!?،؛؟»”"')\]}]+$/

function trimUrl(value: string): string {
  return value.replace(TRAILING_PUNCTUATION, '')
}

/**
 * Renders post text with hashtags highlighted where the author typed them and
 * raw URLs turned into links. The link text stays the URL itself, so the
 * destination host is always visible even for shortened links.
 */
function renderPostContent(content: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0

  for (const match of content.matchAll(TOKEN_REGEX)) {
    const index = match.index ?? 0
    const raw = match[0]
    if (index > lastIndex) parts.push(content.slice(lastIndex, index))

    if (match[1]) {
      const url = trimUrl(raw)
      const trailing = raw.slice(url.length)
      parts.push(
        <a
          key={index}
          href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
          target="_blank"
          rel="noreferrer noopener nofollow"
          dir="ltr"
          title={url}
          className={cn(linkClass, 'break-all underline-offset-4 hover:underline')}
        >
          {url}
        </a>,
      )
      if (trailing) parts.push(trailing)
    } else {
      const tag = raw.slice(1).toLowerCase()
      parts.push(
        TAG_REGEX.test(tag) ? (
          <Link key={index} to={`/tags/${tag}`} dir="auto" className={linkClass}>
            {raw}
          </Link>
        ) : (
          <span key={index} dir="auto" className="text-tag">
            {raw}
          </span>
        ),
      )
    }

    lastIndex = index + raw.length
  }

  if (lastIndex < content.length) parts.push(content.slice(lastIndex))

  return parts
}

export function PostContent({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <p
      dir="auto"
      className={cn(
        'whitespace-pre-wrap break-words text-foreground/95',
        className,
      )}
    >
      {renderPostContent(content)}
    </p>
  )
}
