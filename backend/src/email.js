const config = require('./config')

let nodemailer = null
let smtpTransport = null

function getNodemailer() {
  if (!nodemailer) nodemailer = require('nodemailer')
  return nodemailer
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport
  const nodemailerModule = getNodemailer()
  smtpTransport = nodemailerModule.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined,
  })
  return smtpTransport
}

function buildMessage(code) {
  const subject = 'رمز التحقق من بوتد'
  const text = [
    'رمز التحقق من بوتد',
    '',
    `الرمز: ${code}`,
    `الرمز صالح لمدة ${config.otpExpiryMinutes} دقائق.`,
    'لا تشارك هذا الرمز مع أي أحد.',
    '',
    'إذا ما طلبت هذا الرمز، تجاهل هذه الرسالة.',
  ].join('\n')

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#171717">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e5e5;border-radius:18px;padding:32px">
            <tr>
              <td>
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">بوتد</div>
                <p style="margin:24px 0 8px;font-size:16px;line-height:1.9">أهلًا،</p>
                <p style="margin:0;font-size:15px;line-height:1.9;color:#525252">استخدم الرمز التالي لتأكيد بريدك الإلكتروني:</p>
                <div dir="ltr" style="margin:24px 0;padding:16px;border-radius:14px;background:#f5f5f4;text-align:center;font-family:Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#111111">${code}</div>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.9;color:#525252">الرمز صالح لمدة ${config.otpExpiryMinutes} دقائق. لا تشاركه مع أي أحد.</p>
                <p style="margin:0;font-size:14px;line-height:1.9;color:#737373">إذا ما طلبت هذا الرمز، تجاهل هذه الرسالة.</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#a3a3a3">© ${new Date().getFullYear()} بوتد</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

async function sendWithResend({ to, subject, text, html }) {
  if (!config.emailFrom) {
    throw new Error('EMAIL_FROM is required when using Resend.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to,
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend failed with ${response.status}${body ? `: ${body}` : ''}`)
  }
}

async function sendWithSmtp({ to, subject, text, html }) {
  if (!config.emailFrom) {
    throw new Error('EMAIL_FROM or SMTP_USER is required when using SMTP.')
  }

  await getSmtpTransport().sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
    html,
  })
}

async function sendOtpEmail({ to, code }) {
  const message = buildMessage(code)

  if (config.resendApiKey) {
    await sendWithResend({ to, ...message })
    return
  }

  if (config.smtpHost) {
    await sendWithSmtp({ to, ...message })
    return
  }

  if (config.isProduction) {
    throw new Error('No email provider configured.')
  }

  console.warn(`[pootd-otp] Development OTP for ${to}: ${code}`)
}

module.exports = { sendOtpEmail }
