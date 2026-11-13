const path = require('node:path')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '..', '.env') })

function readString(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : fallback
}

function readNumber(name, fallback, min, max) {
  const raw = readString(name)
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function readBoolean(name, fallback = false) {
  const raw = readString(name).toLowerCase()
  if (!raw) return fallback
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false
  throw new Error(`${name} must be true or false.`)
}

function required(name) {
  const value = readString(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const nodeEnv = readString('NODE_ENV', 'development')
const isProduction = nodeEnv === 'production'
const supabaseUrl = required('SUPABASE_URL')
const supabaseServiceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
const otpSecret = required('OTP_SECRET')

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL must start with http:// or https://')
}

if (otpSecret.length < 32) {
  throw new Error('OTP_SECRET must be at least 32 characters long.')
}

const appOrigins = readString(
  'APP_ORIGINS',
  'http://localhost:5173,http://localhost:5198,http://127.0.0.1:5173,http://127.0.0.1:5198',
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const resendApiKey = readString('RESEND_API_KEY')
const smtpHost = readString('SMTP_HOST')
const emailFrom = readString('EMAIL_FROM') || readString('SMTP_USER')

if (isProduction && !resendApiKey && !smtpHost) {
  throw new Error('Configure RESEND_API_KEY or SMTP_HOST before running in production.')
}

if (!isProduction && !resendApiKey && !smtpHost) {
  console.warn('[pootd-otp] No email provider configured. OTP codes will be printed to this console.')
}

module.exports = {
  nodeEnv,
  isProduction,
  port: readNumber('PORT', 3000, 1, 65535),
  trustProxy: readBoolean('TRUST_PROXY', false),
  appOrigins,
  supabaseUrl,
  supabaseServiceRoleKey,
  otpSecret,
  otpExpiryMinutes: readNumber('OTP_EXPIRY_MINUTES', 10, 1, 60),
  otpResendSeconds: readNumber('OTP_RESEND_SECONDS', 60, 15, 300),
  otpMaxAttempts: readNumber('OTP_MAX_ATTEMPTS', 5, 3, 10),
  otpMaxTotalAttempts: readNumber('OTP_MAX_TOTAL_ATTEMPTS', 20, 5, 100),
  otpMaxPerWindow: readNumber('OTP_MAX_PER_WINDOW', 5, 1, 20),
  otpWindowMinutes: readNumber('OTP_WINDOW_MINUTES', 15, 1, 60),
  resendApiKey,
  smtpHost,
  smtpPort: readNumber('SMTP_PORT', 587, 1, 65535),
  smtpSecure: readBoolean('SMTP_SECURE', false),
  smtpUser: readString('SMTP_USER'),
  smtpPass: readString('SMTP_PASS'),
  emailFrom,
}
