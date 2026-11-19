import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compressPostImage,
  compressedImageName,
  fitWithin,
  POST_IMAGE_MAX_BYTES,
  postImageExtension,
  validatePostImage,
} from './image'

function imageFile(type: string, size = 4): File {
  return new File([new Uint8Array(size)], 'image', { type })
}

describe('validatePostImage', () => {
  it('accepts PNG, JPEG and WebP', () => {
    expect(() => validatePostImage(imageFile('image/png'))).not.toThrow()
    expect(() => validatePostImage(imageFile('image/jpeg'))).not.toThrow()
    expect(() => validatePostImage(imageFile('image/webp'))).not.toThrow()
  })

  it('rejects other file types', () => {
    expect(() => validatePostImage(imageFile('image/gif'))).toThrow('PNG')
  })

  it('rejects files over the five megabyte limit', () => {
    expect(() =>
      validatePostImage(imageFile('image/png', POST_IMAGE_MAX_BYTES + 1)),
    ).toThrow('5 ميجابايت')
  })
})

describe('postImageExtension', () => {
  it('maps MIME types to a stable extension', () => {
    expect(postImageExtension(imageFile('image/png'))).toBe('png')
    expect(postImageExtension(imageFile('image/webp'))).toBe('webp')
    expect(postImageExtension(imageFile('image/jpeg'))).toBe('jpg')
  })
})

describe('fitWithin', () => {
  it('keeps images that already fit', () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 })
    expect(fitWithin(1600, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('scales the longest edge down to the limit', () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: 1600, height: 800 })
    expect(fitWithin(1600, 3200)).toEqual({ width: 800, height: 1600 })
    expect(fitWithin(6000, 4000)).toEqual({ width: 1600, height: 1067 })
  })

  it('never produces a zero dimension', () => {
    expect(fitWithin(3200, 1)).toEqual({ width: 1600, height: 1 })
  })
})

describe('compressedImageName', () => {
  it('swaps the extension for the encoded type', () => {
    expect(compressedImageName('screenshot.PNG', 'image/webp')).toBe('screenshot.webp')
    expect(compressedImageName('صورة الشاشة.png', 'image/jpeg')).toBe('صورة الشاشة.jpg')
    expect(compressedImageName('payload', 'image/webp')).toBe('payload.webp')
  })
})

describe('compressPostImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the original file when the image cannot be decoded', async () => {
    // No decoder available (the jsdom default): the upload must still work.
    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal('Image', undefined)

    const file = imageFile('image/png', 32)
    await expect(compressPostImage(file)).resolves.toBe(file)
  })

  it('never touches files that are not supported images', async () => {
    const file = imageFile('image/gif', 32)
    await expect(compressPostImage(file)).resolves.toBe(file)
  })
})
