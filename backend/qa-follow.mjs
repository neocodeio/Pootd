import fs from 'node:fs'
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

const backendEnv = readEnv('.env')
const frontendEnv = readEnv('../frontend/.env')
const url = backendEnv.SUPABASE_URL
const anonKey = frontendEnv.VITE_SUPABASE_ANON_KEY
const password = 'Pootd-QA-2026!'
const stateFile = 'C:\\Users\\aminf\\AppData\\Local\\Temp\\opencode\\pootd-follow.json'
const mode = process.argv[2] ?? 'create'

const admin = createClient(url, backendEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const client = createClient(url, anonKey, { auth: { persistSession: false } })

function readState() {
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'))
}
function writeState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2))
}

async function signIn(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return c
}

if (mode === 'create') {
  const suffix = Date.now().toString(36)
  const emailA = `qa.f.a.${suffix}@pootd.test`
  const emailB = `qa.f.b.${suffix}@pootd.test`
  const userA = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { username: `qa_fa_${suffix}`, display_name: 'QA منشور' },
  })
  const userB = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { username: `qa_fb_${suffix}`, display_name: 'QA متابع' },
  })
  if (userA.error || userB.error) throw new Error((userA.error ?? userB.error).message)
  const post = await admin
    .from('posts')
    .insert({ author_id: userA.data.user.id, content: 'منشور QA المتابعة', tags: [] })
    .select('id')
    .single()
  if (post.error) throw new Error(post.error.message)

  writeState({
    emailA,
    emailB,
    userA: userA.data.user.id,
    userB: userB.data.user.id,
    postId: post.data.id,
  })

  console.log(JSON.stringify({ emailA, emailB, postId: post.data.id }, null, 2))
}

if (mode === 'cleanup') {
  const state = readState()
  await admin.auth.admin.deleteUser(state.userB)
  await admin.auth.admin.deleteUser(state.userA)
  fs.rmSync(stateFile, { force: true })
  console.log(JSON.stringify({ cleaned: true }))
}
