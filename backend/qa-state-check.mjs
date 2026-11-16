import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
function readEnv(file){return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))}
const env=readEnv('.env')
const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}})
const posts=await admin.from('posts').select('id, created_at, updated_at, content').order('created_at',{ascending:false}).limit(50)
const edited=(posts.data??[]).filter(p=>new Date(p.updated_at).getTime() > new Date(p.created_at).getTime()+1000)
console.log('posts scanned:',posts.data?.length??0,'with updated_at>created_at:',edited.length)
console.log(JSON.stringify(edited.map(p=>({id:p.id.slice(0,8),content:p.content.slice(0,30),created:p.created_at,updated:p.updated_at})),null,2))
const follows=await admin.from('follows').select('follower_id, following_id')
console.log('follows rows:',JSON.stringify(follows.data))
const notif=await admin.from('notifications').select('id,type').eq('type','follow')
console.log('follow notifications:',JSON.stringify(notif.data))
process.exit(0)
