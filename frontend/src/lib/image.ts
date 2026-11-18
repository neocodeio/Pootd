const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export function validatePostImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('الملف لازم يكون PNG أو JPG أو WebP.')
  }
  if (file.size > POST_IMAGE_MAX_BYTES) {
    throw new Error('حجم الصورة لازم يكون 5 ميجابايت أو أقل.')
  }
}

export function postImageExtension(file: File): string {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}
