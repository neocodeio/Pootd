const configuredBase = import.meta.env.VITE_API_URL?.trim()
const fallbackBase = import.meta.env.DEV ? 'http://localhost:3000' : ''

interface AccountApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

function getApiBase(): string {
  const base = configuredBase || fallbackBase
  if (!base) {
    throw new Error('خدمة الحساب غير مهيأة. تواصل مع إدارة الموقع.')
  }
  return base.replace(/\/+$/, '')
}

/**
 * Deletes the signed-in account through the OTP service, which holds the
 * service role key. The database cascades the profile, posts, comments, likes
 * and bookmarks.
 */
export async function deleteAccount(accessToken: string): Promise<void> {
  const base = getApiBase()
  let response: Response

  try {
    response = await fetch(`${base}/api/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new Error('تعذر الاتصال بالخادم. تأكد من تشغيله وحاول مرة ثانية.')
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | AccountApiErrorPayload
      | null
    throw new Error(payload?.error?.message ?? 'تعذر حذف الحساب. حاول مرة ثانية.')
  }
}
