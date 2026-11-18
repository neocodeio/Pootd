import { describe, expect, it } from 'vitest'
import { POST_IMAGE_MAX_BYTES, postImageExtension, validatePostImage } from './image'

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
