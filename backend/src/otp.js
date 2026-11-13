const crypto = require('node:crypto')
const config = require('./config')
const { AppError } = require('./errors')
const { supabase } = require('./supabase')

function generateCode() {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0')
}

function hashCode(code) {
  return crypto.createHmac('sha256', config.otpSecret).update(code).digest('hex')
}

function addMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

async function getLatestOtp(email) {
  const { data, error } = await supabase
    .from('email_otps')
    .select('id, user_id, email, created_at, expires_at, attempts, consumed_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new AppError('SERVER_ERROR', 'تعذر قراءة رمز التحقق.', 500)
  }

  return data
}

async function issueOtp({ userId, email }) {
  const latest = await getLatestOtp(email)

  if (latest) {
    const elapsedMs = Date.now() - new Date(latest.created_at).getTime()
    const retryAfterMs = config.otpResendSeconds * 1000 - elapsedMs
    if (retryAfterMs > 0) {
      throw new AppError(
        'OTP_RATE_LIMITED',
        'محاولات كثيرة. انتظر لحظة ثم حاول مرة ثانية.',
        429,
        { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) },
      )
    }
  }

  const windowStart = addMinutes(-config.otpWindowMinutes)
  const { count, error: countError } = await supabase
    .from('email_otps')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', windowStart)

  if (countError) {
    throw new AppError('SERVER_ERROR', 'تعذر التحقق من حد الإرسال.', 500)
  }

  if ((count ?? 0) >= config.otpMaxPerWindow) {
    throw new AppError(
      'OTP_RATE_LIMITED',
      'طلبت رموزًا كثيرة. انتظر قبل المحاولة مرة ثانية.',
      429,
      { retryAfterSeconds: config.otpWindowMinutes * 60 },
    )
  }

  const code = generateCode()
  const expiresAt = addMinutes(config.otpExpiryMinutes)
  const { data: inserted, error: insertError } = await supabase
    .from('email_otps')
    .insert({
      user_id: userId,
      email,
      code_hash: hashCode(code),
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    throw new AppError('SERVER_ERROR', 'تعذر إنشاء رمز التحقق.', 500)
  }

  void supabase
    .from('email_otps')
    .delete()
    .eq('email', email)
    .lt('created_at', addMinutes(-24 * 60))
    .then(({ error }) => {
      if (error) console.error('[pootd-otp] OTP cleanup failed:', error.message)
    })

  return {
    id: inserted.id,
    code,
    expiresAt,
    resendAfterSeconds: config.otpResendSeconds,
  }
}

async function verifyOtp({ email, code }) {
  const { data, error } = await supabase.rpc('consume_email_otp', {
    candidate_email: email,
    candidate_hash: hashCode(code),
    candidate_max_attempts: config.otpMaxAttempts,
    candidate_max_total_attempts: config.otpMaxTotalAttempts,
    candidate_window_minutes: config.otpWindowMinutes,
  })

  if (error) {
    throw new AppError('SERVER_ERROR', 'تعذر التحقق من الرمز.', 500)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result.status !== 'string') {
    throw new AppError('SERVER_ERROR', 'تعذر التحقق من الرمز.', 500)
  }

  if (result.status === 'expired') {
    throw new AppError('OTP_EXPIRED', 'انتهى رمز التحقق. اطلب رمزًا جديدًا.', 400)
  }

  if (result.status === 'locked') {
    throw new AppError(
      'OTP_LOCKED',
      'محاولات كثيرة على هذا البريد. انتظر ثم اطلب رمزًا جديدًا.',
      429,
    )
  }

  if (result.status === 'invalid') {
    throw new AppError('OTP_INVALID', 'رمز التحقق غير صحيح.', 400, {
      attemptsRemaining: Math.max(Number(result.attempts_remaining) || 0, 0),
    })
  }

  if (result.status !== 'ok' || !result.user_id) {
    throw new AppError('SERVER_ERROR', 'تعذر التحقق من الرمز.', 500)
  }

  const { error: confirmError } = await supabase.auth.admin.updateUserById(
    result.user_id,
    { email_confirm: true },
  )

  if (confirmError) {
    throw new AppError('SERVER_ERROR', 'تعذر تأكيد البريد الإلكتروني.', 500)
  }

  return { userId: result.user_id }
}

async function findUserIdByEmail(email) {
  const { data, error } = await supabase.rpc('get_user_id_by_email', {
    candidate_email: email,
  })

  if (error) {
    throw new AppError('SERVER_ERROR', 'تعذر البحث عن الحساب.', 500)
  }

  return typeof data === 'string' ? data : null
}

module.exports = {
  findUserIdByEmail,
  issueOtp,
  verifyOtp,
}
