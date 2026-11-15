import { Brand } from '@/components/brand'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

const steps = [
  'أنشئ مشروع Supabase من supabase.com.',
  'شغّل ملفات 0001_init.sql و0002_email_otp.sql و0003_profile_cover.sql و0004_bookmarks.sql و0005_notifications.sql و0006_reports.sql و0007_rate_limits.sql في محرر SQL.',
  'خلّ تأكيد البريد مفعّلًا حتى ما يقدر أحد يسجل دخول قبل التحقق.',
  'انسخ Project URL ومفتاح anon إلى frontend/.env.',
  'جهّز backend/.env بمفتاح service role وسر OTP ومزود البريد.',
  'شغّل خادم OTP ثم أعد تشغيل واجهة التطوير.',
]

export function SetupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <Brand variant="compact" />
            <p className="mt-2 text-xs text-muted-foreground">
              مساحة عربية للأمن السيبراني
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            الإعداد مطلوب
          </Badge>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            جهّز Supabase وخدمة OTP.
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            الواجهة جاهزة. أضف متغيرات البيئة ونفّذ ترحيل قاعدة البيانات لتشغيل بوتد.
          </p>

          <ol className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-7 text-foreground/90">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-border bg-secondary/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">frontend/.env</p>
            <pre
              dir="ltr"
              className="mt-2 overflow-x-auto text-left font-mono text-xs leading-6 text-foreground/80"
            >
              {`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=http://localhost:3000`}
            </pre>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">backend/.env</p>
            <pre
              dir="ltr"
              className="mt-2 overflow-x-auto text-left font-mono text-xs leading-6 text-foreground/80"
            >
              {`SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OTP_SECRET=at-least-32-random-characters
RESEND_API_KEY=re_...
EMAIL_FROM=Pootd <no-reply@your-domain.com>`}
            </pre>
          </div>

          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            التعليمات الكاملة في{' '}
            <span dir="ltr" className="font-mono text-foreground">
              backend/README.md
            </span>
            . مفتاح anon آمن للمتصفح؛ لا تنشر مفتاح service role أبدًا.
          </p>
        </div>
      </Card>
    </div>
  )
}
