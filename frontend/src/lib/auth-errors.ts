export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'أكّد بريدك الإلكتروني أولًا — أدخل رمز التحقق.'
  }
  if (
    normalized.includes('invalid otp') ||
    normalized.includes('token has expired') ||
    normalized.includes('otp_expired')
  ) {
    return 'رمز التحقق غير صحيح أو منتهي. اطلب رمزًا جديدًا.'
  }
  if (normalized.includes('user already registered')) {
    return 'يوجد حساب بهذا البريد الإلكتروني. جرّب تسجيل الدخول.'
  }
  if (normalized.includes('password should be at least')) {
    return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
  }
  if (
    normalized.includes('rate limit') ||
    normalized.includes('only request this after')
  ) {
    return 'محاولات كثيرة. انتظر لحظة ثم حاول مرة ثانية.'
  }
  if (
    normalized.includes('unable to validate email') ||
    normalized.includes('invalid email')
  ) {
    return 'أدخل بريدًا إلكترونيًا صحيحًا.'
  }
  if (normalized.includes('signups not allowed')) {
    return 'إنشاء الحسابات متوقف حاليًا.'
  }

  return message
}
