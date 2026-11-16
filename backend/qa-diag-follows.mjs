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

const env = readEnv('.env')
const anon = readEnv('../frontend/.env').VITE_SUPABASE_ANON_KEY
const state = JSON.parse(
  fs.readFileSync('C:\\Users\\aminf\\AppData\\Local\\Temp\\opencode\\pootd-follow.json', 'utf8'),
)
const url = env.SUPABASE_URL
const password = 'Pootd-QA-2026!'

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const user = createClient(url, anon, { auth: { persistSession: false } })
const signIn = await user.auth.signInWithPassword({ email: state.emailB, password })
if (signIn.error) throw new Error(signIn.error.message)

const adminEvents = []
const userEvents = []
const notifEvents = []

const adminChannel = admin
  .channel(`diag-follows-admin-${Date.now()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, (p) =>
    adminEvents.push(p.eventType),
  )

const userChannel = user
  .channel(`diag-follows-user-${Date.now()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, (p) =>
    userEvents.push(p.eventType),
  )

const notifChannel = user
  .channel(`diag-notif-user-${Date.now()}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${state.userA}`,
    },
    (p) => notifEvents.push(p.eventType),
  )

const statuses = {}
await Promise.all(
  [
    ['admin', adminChannel],
    ['user', userChannel],
    ['notif', notifChannel],
  ].map(
    ([name, channel]) =>
      new Promise((resolve, reject) => {
        channel.subscribe((status) => {
          statuses[name] = status
          if (status === 'SUBSCRIBED') resolve()
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`${name}: ${status}`))
        })
      }),
  ),
)

console.log('statuses:', JSON.stringify(statuses))

const insert = await admin
  .from('follows')
  .insert({ follower_id: state.userB, following_id: state.userA })
console.log('insert B->A via admin:', insert.error ? insert.error.message : 'ok')

await new Promise((resolve) => setTimeout(resolve, 7000))

console.log('admin follows events:', JSON.stringify(adminEvents))
console.log('authenticated follows events:', JSON.stringify(userEvents))
console.log('authenticated notification events:', JSON.stringify(notifEvents))

await admin
  .from('follows')
  .delete()
  .eq('follower_id', state.userB)
  .eq('following_id', state.userA)

for (const channel of [adminChannel, userChannel, notifChannel]) {
  await admin.removeChannel(channel)
}

process.exit(0)
