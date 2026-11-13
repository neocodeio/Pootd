const cors = require('cors')
const express = require('express')
const config = require('./config')
const { AppError } = require('./errors')
const { sendOtpEmail } = require('./email')
const { findUserIdByEmail, issueOtp, verifyOtp } = require('./otp')
const { createRateLimiter } = require('./rate-limit')
const { supabase } = require('./supabase')
const { validateEmail, validateOtpCode, validateSignup } = require('./validation')

const app = express()

app.disable('x-powered-by')
if (config.trustProxy) app.set('trust proxy', 1)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.appOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86_400,
  }),
)
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use(
  '/api/auth',
  createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'محاولات كثيرة. انتظر ثم حاول مرة ثانية.',
  }),
)

async function deleteUserQuietly(userId) {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) console.error('[pootd-otp] Failed to delete user:', error.message)
  } catch (error) {
    console.error('[pootd-otp] Failed to delete user:', error)
  }
}

async function deleteOtpQuietly(otpId) {
  if (!otpId) return
  try {
    const { error } = await supabase.from('email_otps').delete().eq('id', otpId)
    if (error) console.error('[pootd-otp] Failed to delete OTP:', error.message)
  } catch (error) {
    console.error('[pootd-otp] Failed to delete OTP:', error)
  }
}

app.post('/api/auth/signup', async (req, res) => {
  const input = validateSignup(req.body)

  const { data: existingProfile, error: usernameError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', input.username)
    .maybeSingle()

  if (usernameError) {
    throw new AppError('SERVER_ERROR', 'تعذر التحقق من اسم المستخدم.', 500)
  }

  if (existingProfile) {
    throw new AppError('USERNAME_TAKEN', 'اسم المستخدم محجوز.', 409)
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: {
      username: input.username,
      display_name: input.displayName,
    },
  })

  if (createError) {
    const message = createError.message.toLowerCase()
    if (
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists')
    ) {
      throw new AppError(
        'EMAIL_TAKEN',
        'يوجد حساب بهذا البريد الإلكتروني. جرّب تسجيل الدخول أو اطلب رمز تحقق.',
        409,
      )
    }
    if (message.includes('password')) {
      throw new AppError('WEAK_PASSWORD', 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.', 400)
    }
    throw new AppError('SERVER_ERROR', 'تعذر إنشاء الحساب.', 500)
  }

  const user = created.user
  if (!user) {
    throw new AppError('SERVER_ERROR', 'تعذر إنشاء الحساب.', 500)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    await deleteUserQuietly(user.id)
    throw new AppError('SERVER_ERROR', 'تعذر تجهيز الملف الشخصي.', 500)
  }

  if (!profile || profile.username !== input.username) {
    await deleteUserQuietly(user.id)
    throw new AppError('USERNAME_TAKEN', 'اسم المستخدم محجوز.', 409)
  }

  try {
    const otp = await issueOtp({ userId: user.id, email: input.email })
    await sendOtpEmail({ to: input.email, code: otp.code })

    res.status(201).json({
      userId: user.id,
      email: input.email,
      resendAfterSeconds: otp.resendAfterSeconds,
    })
  } catch (error) {
    await deleteUserQuietly(user.id)
    if (error instanceof AppError) throw error
    console.error('[pootd-otp] Signup email failed:', error)
    throw new AppError('EMAIL_SEND_FAILED', 'تعذر إرسال رمز التحقق. حاول مرة ثانية.', 502)
  }
})

app.post('/api/auth/otp/resend', async (req, res) => {
  const email = validateEmail(req.body?.email)
  const userId = await findUserIdByEmail(email)

  if (!userId) {
    res.json({ ok: true, resendAfterSeconds: config.otpResendSeconds })
    return
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError) {
    throw new AppError('SERVER_ERROR', 'تعذر قراءة الحساب.', 500)
  }

  if (!userData.user || userData.user.email_confirmed_at) {
    res.json({ ok: true, resendAfterSeconds: config.otpResendSeconds })
    return
  }

  let otp = null

  try {
    otp = await issueOtp({ userId, email })
    await sendOtpEmail({ to: email, code: otp.code })
    res.json({ ok: true, resendAfterSeconds: otp.resendAfterSeconds })
  } catch (error) {
    if (!(error instanceof AppError)) {
      await deleteOtpQuietly(otp?.id)
      console.error('[pootd-otp] Resend email failed:', error)
      throw new AppError('EMAIL_SEND_FAILED', 'تعذر إرسال رمز التحقق. حاول مرة ثانية.', 502)
    }
    throw error
  }
})

app.post('/api/auth/otp/verify', async (req, res) => {
  const email = validateEmail(req.body?.email)
  const code = validateOtpCode(req.body?.code)
  const result = await verifyOtp({ email, code })
  res.json({ ok: true, userId: result.userId })
})

app.use('/api', (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'المسار غير موجود.',
    },
  })
})

app.use((error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    if (error.status >= 500) console.error('[pootd-otp]', error)
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...error.details,
      },
    })
    return
  }

  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'صيغة الطلب غير صحيحة.',
      },
    })
    return
  }

  if (error?.message === 'Not allowed by CORS') {
    res.status(403).json({
      error: {
        code: 'CORS_NOT_ALLOWED',
        message: 'المصدر غير مسموح.',
      },
    })
    return
  }

  console.error('[pootd-otp] Unhandled error:', error)
  res.status(500).json({
    error: {
      code: 'SERVER_ERROR',
      message: 'حدث خطأ غير متوقع. حاول مرة ثانية.',
    },
  })
})

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`[pootd-otp] Listening on http://localhost:${config.port}`)
  })
}

module.exports = app
