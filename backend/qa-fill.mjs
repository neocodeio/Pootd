import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function readEnv(file) {
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const env = readEnv('.env')
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const AMIN_ID = '8fbcb9c7-3c28-4166-8283-8e2a7f6b6785'
const COMMENT_POST_ID = '903570f7-8416-483c-a8d7-6c783b62c9f8'

const stamp = Date.now()
const email = `qa-fill-${stamp}@example.com`
const password = `Qa!${stamp}fill`
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: 'QA Fill', username: `qafill${stamp % 1000000}` },
})
if (created.error) throw new Error(created.error.message)
const qaUser = created.data.user

const note = await admin
  .from('notifications')
  .insert({ recipient_id: qaUser.id, actor_id: AMIN_ID, type: 'follow' })
  .select('id')
  .single()
if (note.error) console.log('NOTIFICATION INSERT ERROR:', note.error.message)

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9371
const profileDir = path.join(os.tmpdir(), `pootd-cdp-${Date.now()}`)
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  'about:blank',
])

let ws
try {
  let version
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      version = await res.json()
      break
    } catch {
      await sleep(250)
    }
  }
  if (!version) throw new Error('chrome did not start')
  const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  const target = await targetRes.json()
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  const consoleErrors = []
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(
        String(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text).slice(0, 300),
      )
    }
    if (!msg.id) return
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(msg.error.message))
    else entry.resolve(msg.result)
  })
  function send(method, params = {}) {
    const id = ++nextId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
    return result.result.value
  }
  async function waitFor(expression, timeoutMs = 25000) {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      try {
        if (await evaluate(expression)) return true
      } catch {}
      await sleep(200)
    }
    return false
  }
  async function open(pathname, { width = 1920, height = 919, dark = true } = {}) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
    await send('Page.navigate', { url: `http://localhost:5198${pathname}` })
    await sleep(600)
    await evaluate(`localStorage.setItem('pootd-theme', ${JSON.stringify(dark ? 'dark' : 'light')}); true`)
    await send('Page.reload', { ignoreCache: true })
    await sleep(800)
    await waitFor(`document.readyState === 'complete' && document.body.innerText.length > 80`)
    await waitFor(`document.querySelectorAll('[class*="animate-pulse"]').length === 0`)
    await sleep(600)
  }
  async function shot(name, clip, scale = 4) {
    const params = { format: 'png' }
    if (clip) params.clip = { ...clip, scale }
    const result = await send('Page.captureScreenshot', params)
    fs.writeFileSync(path.join(process.cwd(), name), Buffer.from(result.data, 'base64'))
  }
  async function rectOf(expression, pad = 8) {
    return JSON.parse(
      await evaluate(`(() => {
        const el = ${expression}
        if (!el) return 'null'
        const r = el.getBoundingClientRect()
        return JSON.stringify({
          x: Math.max(0, Math.round(r.x) - ${pad}),
          y: Math.max(0, Math.round(r.y) - ${pad}),
          width: Math.round(r.width) + ${pad * 2},
          height: Math.round(r.height) + ${pad * 2},
        })
      })()`),
    )
  }

  const audit = `(() => {
    const badges = Array.from(document.querySelectorAll('[role="img"][aria-label="حساب موثّق"]'))
    return JSON.stringify({
      count: badges.length,
      items: badges.map((b) => {
        const svgs = Array.from(b.querySelectorAll('svg'))
        const seal = svgs[0]
        const tick = svgs[1]
        const sealPath = seal?.querySelector('path')
        const tickPath = tick?.querySelector('path')
        const r = b.getBoundingClientRect()
        return {
          box: { w: Math.round(r.width), h: Math.round(r.height) },
          seal: sealPath
            ? {
                fill: getComputedStyle(sealPath).fill,
                stroke: getComputedStyle(sealPath).stroke,
                strokeWidth: sealPath.getAttribute('stroke-width'),
              }
            : null,
          tick: tickPath
            ? {
                fill: getComputedStyle(tickPath).fill,
                stroke: getComputedStyle(tickPath).stroke,
                strokeWidth: tickPath.getAttribute('stroke-width'),
                w: Math.round(tick.getBoundingClientRect().width),
              }
            : null,
          tickOverlapsSeal: (() => {
            if (!seal || !tick) return null
            const a = seal.getBoundingClientRect()
            const c = tick.getBoundingClientRect()
            return Math.round(a.x) === Math.round(c.x) && Math.round(a.y) === Math.round(c.y) && Math.round(a.width) === Math.round(c.width)
          })(),
          bg: getComputedStyle(b).backgroundColor,
        }
      }),
      lucide: document.querySelectorAll('svg.lucide').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
    })
  })()`

  await open('/login')
  await waitFor(`Boolean(document.querySelector('#email'))`)
  await evaluate(`(() => {
    const setValue = (el, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    setValue(document.querySelector('#email'), ${JSON.stringify(email)})
    setValue(document.querySelector('#password'), ${JSON.stringify(password)})
    document.querySelector('form').requestSubmit()
    return true
  })()`)
  const results = {
    loggedIn: await waitFor(`location.pathname === '/' && document.body.innerText.includes('أنشئ منشور')`),
  }

  await open('/u/amin')
  await waitFor(`Boolean(document.querySelector('main h1 [role="img"]'))`)
  results.profileDark = JSON.parse(await evaluate(audit))
  await shot('qa-fill-profile-dark.png', await rectOf(`document.querySelector('main h1')`, 10), 6)
  await shot('qa-profile-1920-dark.png', null, 1)

  await open('/')
  await waitFor(`Boolean(document.querySelector('[role="img"][aria-label="حساب موثّق"]'))`)
  results.feedDark = JSON.parse(await evaluate(audit))
  await shot(
    'qa-fill-postcard-dark.png',
    await rectOf(`document.querySelector('[role="img"][aria-label="حساب موثّق"]').parentElement`, 10),
    6,
  )

  await open('/search?q=amin')
  await waitFor(`document.body.innerText.includes('الأعضاء')`)
  results.searchDark = JSON.parse(await evaluate(audit))
  await shot('qa-fill-search-dark.png', await rectOf(`document.querySelector('[role="img"][aria-label="حساب موثّق"]')?.closest('div')`, 10), 6)

  await open(`/p/${COMMENT_POST_ID}`)
  await waitFor(`document.body.innerText.includes('التعليقات')`, 30000)
  await sleep(1500)
  results.commentDark = JSON.parse(await evaluate(audit))

  await open('/notifications')
  await waitFor(`document.body.innerText.includes('الإشعارات')`)
  await sleep(1200)
  results.notificationsDark = JSON.parse(await evaluate(audit))
  await shot(
    'qa-fill-notification-dark.png',
    await rectOf(`document.querySelector('[role="img"][aria-label="حساب موثّق"]')?.closest('div[class*="flex"]')`, 10),
    6,
  )

  await open('/u/amin', { dark: false })
  await waitFor(`Boolean(document.querySelector('main h1 [role="img"]'))`)
  results.profileLight = JSON.parse(await evaluate(audit))
  await shot('qa-fill-profile-light.png', await rectOf(`document.querySelector('main h1')`, 10), 6)
  await shot('qa-profile-1920-light.png', null, 1)

  await open('/u/amin', { width: 390, height: 844 })
  await waitFor(`Boolean(document.querySelector('main h1 [role="img"]'))`)
  results.profileMobile = JSON.parse(await evaluate(audit))
  await shot('qa-fill-profile-mobile.png', await rectOf(`document.querySelector('main h1')`, 10), 6)

  results.consoleErrors = consoleErrors
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  console.log('ERROR:', error?.stack ?? error)
  try {
    if (ws) console.log('STATE:', await evaluate(`JSON.stringify({ url: location.href, text: document.body.innerText.slice(0, 200) })`))
  } catch {}
  console.log('CONSOLE:', consoleErrors.slice(-10))
} finally {
  if (ws) ws.close()
  chrome.kill()
  await sleep(500)
  fs.rmSync(profileDir, { recursive: true, force: true })
  if (note.data?.id) await admin.from('notifications').delete().eq('id', note.data.id)
  try {
    await admin.auth.admin.deleteUser(qaUser.id)
  } catch (error) {
    console.log('CLEANUP ERROR:', error?.message ?? error)
  }
  process.exit(0)
}
