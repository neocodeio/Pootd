const DEFAULT_IMAGE = '/pootd_icon_black.png'
const DEFAULT_DESCRIPTION =
  'بوتد مجتمع عربي للأمن السيبراني. شارك اكتشافاتك، اسأل، وتواصل مع ناس تشبهك.'

function env(name) {
  return process.env[name]?.trim() ?? ''
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  )
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function absoluteUrl(value, origin) {
  if (!value) return `${origin}${DEFAULT_IMAGE}`
  if (/^https?:\/\//i.test(value)) return value
  return `${origin}${value.startsWith('/') ? '' : '/'}${value}`
}

function supabaseConfig() {
  return {
    url: (env('VITE_SUPABASE_URL') || env('SUPABASE_URL')).replace(/\/+$/, ''),
    key: env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY'),
  }
}

async function fetchRow(path, params) {
  const { url, key } = supabaseConfig()
  if (!url || !key) return null

  const response = await fetch(`${url}/rest/v1/${path}?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) return null
  const rows = await response.json()
  return Array.isArray(rows) ? (rows[0] ?? null) : null
}

async function buildMeta(type, value, origin) {
  if (type === 'post' && value) {
    const row = await fetchRow(
      'posts',
      new URLSearchParams({
        id: `eq.${value}`,
        select:
          '*,author:profiles!posts_author_id_fkey(display_name,username,avatar_url)',
        limit: '1',
      }),
    )
    if (!row) return null

    const author = row.author ?? {}
    const description = cleanText(row.content).slice(0, 180) || DEFAULT_DESCRIPTION
    const title = `${author.display_name || 'منشور'} (@${author.username || 'pootd'}) — بوتد`
    const image = absoluteUrl(
      row.image_url || author.avatar_url || DEFAULT_IMAGE,
      origin,
    )

    return {
      type: 'article',
      title,
      description,
      url: `${origin}/p/${encodeURIComponent(value)}`,
      image,
      imageAlt: 'صورة منشور على بوتد',
      published: row.created_at,
    }
  }

  if (type === 'profile' && value) {
    const row = await fetchRow(
      'profiles',
      new URLSearchParams({
        username: `eq.${value.toLowerCase()}`,
        select: '*',
        limit: '1',
      }),
    )
    if (!row) return null

    return {
      type: 'profile',
      title: `${row.display_name || row.username} (@${row.username}) — بوتد`,
      description: cleanText(row.bio) || DEFAULT_DESCRIPTION,
      url: `${origin}/u/${encodeURIComponent(row.username)}`,
      image: absoluteUrl(row.avatar_url || DEFAULT_IMAGE, origin),
      imageAlt: `صورة ${row.display_name || row.username}`,
    }
  }

  if (type === 'tag' && value) {
    const tag = value.toLowerCase()
    return {
      type: 'website',
      title: `#${tag} — بوتد`,
      description: `منشورات المجتمع عن #${tag} على بوتد.`,
      url: `${origin}/tags/${encodeURIComponent(tag)}`,
      image: absoluteUrl(DEFAULT_IMAGE, origin),
      imageAlt: 'بوتد — مجتمع الأمن السيبراني العربي',
    }
  }

  return null
}

function renderMeta(meta) {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}" />`,
    '<meta property="og:site_name" content="بوتد" />',
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ]

  if (meta.published) {
    tags.push(
      `<meta property="article:published_time" content="${escapeHtml(meta.published)}" />`,
    )
  }

  return tags.join('\n    ')
}

function injectMeta(html, meta) {
  const withoutOldMeta = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(
      /<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,
      '',
    )

  return withoutOldMeta.replace(
    /<\/head>/i,
    `${renderMeta(meta)}\n  </head>`,
  )
}

async function loadIndex(origin) {
  const response = await fetch(`${origin}/index.html`, { cache: 'no-store' })
  if (!response.ok) throw new Error('index.html is unavailable')
  return response.text()
}

function sendHtml(response, html, status = 200, cache = 'public, s-maxage=300, stale-while-revalidate=600') {
  response.statusCode = status
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', cache)
  response.end(html)
}

function first(value) {
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(request, response) {
  const type = first(request.query?.type)
  const id = first(request.query?.id)
  const username = first(request.query?.username)
  const tag = first(request.query?.tag)
  const value = type === 'post' ? id : type === 'profile' ? username : tag

  const protocol = request.headers['x-forwarded-proto'] || 'https'
  const host = request.headers['x-forwarded-host'] || request.headers.host
  const origin = env('PUBLIC_SITE_URL').replace(/\/+$/, '') || `${protocol}://${host}`

  try {
    const meta = await buildMeta(type, value, origin)
    if (!meta) {
      sendHtml(response, await loadIndex(origin), 200, 'public, s-maxage=60')
      return
    }

    sendHtml(response, injectMeta(await loadIndex(origin), meta))
  } catch (error) {
    console.error(error)
    try {
      sendHtml(response, await loadIndex(origin), 200, 'no-store')
    } catch {
      response.statusCode = 502
      response.end('Bad gateway')
    }
  }
}
