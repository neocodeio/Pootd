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

const a = createClient(url, anon, { auth: { persistSession: false } })
const aSignIn = await a.auth.signInWithPassword({ email: state.emailA, password })
if (aSignIn.error) throw new Error(aSignIn.error.message)

try {
  const cat = await admin.schema('pg_catalog').from('pg_publication_tables').select('*')
  console.log('catalog read:', JSON.stringify(cat.data), cat.error?.message ?? '')
} catch (error) {
  console.log('catalog read threw:', error.message)
}

const postEvents = []
const notifEvents = []

const postChannel = admin
  .channel(`diag-posts-${Date.now()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (p) =>
    postEvents.push(p.eventType),
  )

const notifChannel = a
  .channel(`diag-notif-a-${Date.now()}`)
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

await Promise.all(
  [postChannel, notifChannel].map(
    (channel) =>
      new Promise((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve()
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status))
        })
      }),
  ),
)
console.log('subscribed')

const tempPost = await admin
  .from('posts')
  .insert({ author_id: state.userA, content: 'diag post', tags: [] })
  .select('id')
  .single()
console.log('temp post:', tempPost.error ? tempPost.error.message : tempPost.data.id)

const follow = await admin
  .from('follows')
  .insert({ follower_id: state.userB, following_id: state.userA })
console.log('follow insert:', follow.error ? follow.error.message : 'ok')

await new Promise((resolve) => setTimeout(resolve, 7000))

console.log('posts events:', JSON.stringify(postEvents))
console.log('A notification events:', JSON.stringify(notifEvents))

if (tempPost.data?.id) await admin.from('posts').delete().eq('id', tempPost.data.id)
await admin
  .from('follows')
  .delete()
  .eq('follower_id', state.userB)
  .eq('following_id', state.userA)

await admin.removeChannel(postChannel)
await admin.removeChannel(notifChannel)

process.exit(0)
