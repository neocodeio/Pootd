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
const anonKey = readEnv('../frontend/.env').VITE_SUPABASE_ANON_KEY
const url = backendEnv.SUPABASE_URL
const admin = createClient(url, backendEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const state = JSON.parse(
  fs.readFileSync('C:\\Users\\aminf\\AppData\\Local\\Temp\\opencode\\pootd-follow.json', 'utf8'),
)

const client = createClient(url, anonKey, { auth: { persistSession: false } })
const { error: signInError } = await client.auth.signInWithPassword({
  email: state.emailB,
  password: 'Pootd-QA-2026!',
})
if (signInError) throw new Error(`sign-in failed: ${signInError.message}`)

const events = []
const channel = client
  .channel(`probe-follows-${Date.now()}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'follows' },
    (payload) => events.push({ event: payload.eventType, new: payload.new, old: payload.old }),
  )

await new Promise((resolve, reject) => {
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') resolve()
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status))
  })
})

console.log('subscribed to follows changes')

const { error: insertError } = await client
  .from('follows')
  .insert({ follower_id: state.userB, following_id: state.userA })
console.log('insert via user client:', insertError ? insertError.message : 'ok')

await new Promise((resolve) => setTimeout(resolve, 6000))
console.log('events seen:', JSON.stringify(events, null, 2))

await admin
  .from('follows')
  .delete()
  .eq('follower_id', state.userB)
  .eq('following_id', state.userA)
await client.removeChannel(channel)
process.exit(0)
