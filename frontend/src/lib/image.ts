const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024

/** Longest edge a post image is stored at — bigger uploads are downscaled. */
export const POST_IMAGE_MAX_EDGE = 1600

/** WebP quality used before upload. */
export const POST_IMAGE_QUALITY = 0.85

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

/** Scales a size down so its longest edge fits `maxEdge`, never up. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = POST_IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }

  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Keeps the original base name but matches the encoded MIME type. */
export function compressedImageName(name: string, mimeType: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image'
  const extension =
    mimeType === 'image/webp' ? 'webp' : mimeType === 'image/png' ? 'png' : 'jpg'
  return `${base}.${extension}`
}

interface DecodedImage {
  image: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Fall through to an <img> decode.
    }
  }

  if (typeof Image === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return null
  }

  let url = ''
  try {
    url = URL.createObjectURL(file)
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('تعذّر قراءة الصورة.'))
      image.src = url
    })

    return {
      image: element,
      width: element.naturalWidth || element.width,
      height: element.naturalHeight || element.height,
      dispose: () => URL.revokeObjectURL(url),
    }
  } catch {
    if (url) URL.revokeObjectURL(url)
    return null
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Downscales a picked image to at most {@link POST_IMAGE_MAX_EDGE} on its
 * longest edge and re-encodes it as WebP, so a 4 MB phone screenshot uploads
 * as a few hundred kilobytes. Anything that cannot be decoded or does not get
 * smaller is returned untouched — choosing an image must never fail.
 */
export async function compressPostImage(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return file
  if (typeof document === 'undefined') return file

  let decoded: DecodedImage | null = null
  try {
    decoded = await decodeImage(file)
  } catch {
    return file
  }
  if (!decoded) return file

  try {
    if (!decoded.width || !decoded.height) return file

    const { width, height } = fitWithin(decoded.width, decoded.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.image, 0, 0, width, height)

    let encoded = await canvasToBlob(canvas, 'image/webp', POST_IMAGE_QUALITY)
    if (!encoded || encoded.type !== 'image/webp') {
      // Older Safari cannot encode WebP. Paint transparency white first so a
      // PNG screenshot does not turn black in JPEG.
      context.save()
      context.globalCompositeOperation = 'destination-over'
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.restore()
      encoded = await canvasToBlob(canvas, 'image/jpeg', POST_IMAGE_QUALITY)
    }

    if (!encoded || encoded.size >= file.size) return file

    return new File([encoded], compressedImageName(file.name, encoded.type), {
      type: encoded.type,
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    decoded.dispose()
  }
}
