const { AppError } = require('./errors')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/
const CODE_REGEX = /^\d{4}$/

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeEmail(value) {
  return asString(value).trim().toLowerCase()
}

function normalizeUsername(value) {
  return asString(value).trim().toLowerCase()
}

function validateEmail(value) {
  const email = normalizeEmail(value)
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new AppError('INVALID_EMAIL', 'أدخل بريدًا إلكترونيًا صحيحًا.', 400)
  }
  return email
}

function validateOtpCode(value) {
  const code = asString(value).replace(/\s+/g, '')
  if (!CODE_REGEX.test(code)) {
    throw new AppError('OTP_INVALID', 'رمز التحقق لازم يكون 4 أرقام.', 400)
  }
  return code
}

function validateSignup(value) {
  const body = asObject(value)
  const displayName = asString(body.displayName).trim()
  const username = normalizeUsername(body.username)
  const email = normalizeEmail(body.email)
  const password = asString(body.password)

  if (displayName.length < 1 || displayName.length > 48) {
    throw new AppError('INVALID_INPUT', 'الاسم الظاهر لازم يكون من 1 إلى 48 حرفًا.', 400)
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new AppError(
      'INVALID_INPUT',
      'اسم المستخدم من 3 إلى 24 حرفًا: حروف إنجليزية صغيرة وأرقام وشرطة سفلية.',
      400,
    )
  }

  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    throw new AppError('INVALID_EMAIL', 'أدخل بريدًا إلكترونيًا صحيحًا.', 400)
  }

  if (password.length < 8 || password.length > 128) {
    throw new AppError('WEAK_PASSWORD', 'كلمة المرور لازم تكون من 8 إلى 128 حرفًا.', 400)
  }

  return { displayName, username, email, password }
}

module.exports = {
  normalizeEmail,
  validateEmail,
  validateOtpCode,
  validateSignup,
}
