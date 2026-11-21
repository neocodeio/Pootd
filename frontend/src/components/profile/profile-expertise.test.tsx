import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Profile } from '@/lib/types'
import { ProfileExpertise } from './profile-expertise'

afterEach(cleanup)

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'id-amin',
    username: 'amin',
    display_name: 'أمين',
    bio: '',
    avatar_url: '',
    cover_image_url: '',
    website: '',
    github: '',
    social_links: [],
    skills: [],
    tools: [],
    certifications: [],
    followers_count: 0,
    following_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ProfileExpertise', () => {
  it('renders the three groups, chips and the linked award', () => {
    render(
      <ProfileExpertise
        profile={profile({
          skills: ['أمن الشبكات'],
          tools: ['Wireshark'],
          certifications: [
            {
              title: 'OSCP',
              issuer: 'Offensive Security',
              year: '2024',
              url: 'https://example.com/oscp',
            },
            {
              title: 'بطل مسابقة الأمن السيبراني',
              issuer: 'جامعة الملك سعود',
              year: '2022',
              url: '',
            },
          ],
        })}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'الخبرة والشهادات' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'المهارات ومجالات الخبرة' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'الأدوات' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'الشهادات والإنجازات' }),
    ).toBeTruthy()
    expect(screen.getByText('أمن الشبكات')).toBeTruthy()
    expect(screen.getByText('Wireshark')).toBeTruthy()
    expect(screen.getByText('Offensive Security · 2024')).toBeTruthy()
    expect(
      screen.getByText('جامعة الملك سعود · 2022'),
    ).toBeTruthy()

    const link = screen.getByRole('link', { name: /OSCP/ })
    expect(link.getAttribute('href')).toBe('https://example.com/oscp')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('renders nothing when every list is empty', () => {
    const { container } = render(<ProfileExpertise profile={profile()} />)
    expect(container.innerHTML).toBe('')
  })

  it('tolerates the columns missing before the migration runs', () => {
    const legacy = profile()
    delete (legacy as Partial<Profile>).skills
    delete (legacy as Partial<Profile>).tools
    delete (legacy as Partial<Profile>).certifications

    const { container } = render(<ProfileExpertise profile={legacy} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders only the groups that have data', () => {
    render(<ProfileExpertise profile={profile({ skills: ['التحقيق الرقمي'] })} />)

    expect(
      screen.getByRole('heading', { name: 'المهارات ومجالات الخبرة' }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'الأدوات' })).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'الشهادات والإنجازات' }),
    ).toBeNull()
  })
})
