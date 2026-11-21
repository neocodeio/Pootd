import {
  Award01Icon,
  CommandLineIcon,
  Link04Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import type { ReactNode } from 'react'
import { parseCertifications, parseSkills, parseTools } from '@/lib/expertise'
import type { Certification, Profile } from '@/lib/types'

function Group({
  icon,
  title,
  children,
}: {
  icon: IconSvgElement
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-3.5" aria-hidden="true" />
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Labels({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          dir="auto"
          className="inline-flex max-w-full items-center break-words rounded-full border border-border bg-secondary/40 px-3 py-1 text-sm leading-6 text-foreground/90"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function CertificationRow({ certification }: { certification: Certification }) {
  const meta = [certification.issuer, certification.year].filter(Boolean).join(' · ')

  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        aria-hidden="true"
      >
        <HugeiconsIcon icon={Award01Icon} className="size-4" />
      </span>
      <div className="min-w-0">
        <p dir="auto" className="break-words text-sm font-medium leading-6 text-foreground">
          {certification.url ? (
            <a
              href={certification.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex max-w-full items-center gap-1.5 break-words rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {certification.title}
              <HugeiconsIcon
                icon={Link04Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </a>
          ) : (
            certification.title
          )}
        </p>
        {meta ? (
          <p dir="auto" className="break-words text-xs leading-5 text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Skills, tools and awards on the profile. The card only renders when the
 * member filled at least one list, and every list tolerates a missing column
 * (before `0020_profile_expertise.sql` runs the parsers return empty arrays).
 */
export function ProfileExpertise({ profile }: { profile: Profile }) {
  const skills = parseSkills(profile.skills)
  const tools = parseTools(profile.tools)
  const certifications = parseCertifications(profile.certifications)

  if (skills.length === 0 && tools.length === 0 && certifications.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="profile-expertise-title"
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 id="profile-expertise-title" className="text-sm font-semibold">
        الخبرة والشهادات
      </h2>

      <div className="mt-3 space-y-4">
        {skills.length > 0 ? (
          <Group icon={SecurityCheckIcon} title="المهارات ومجالات الخبرة">
            <Labels items={skills} />
          </Group>
        ) : null}

        {tools.length > 0 ? (
          <Group icon={CommandLineIcon} title="الأدوات">
            <Labels items={tools} />
          </Group>
        ) : null}

        {certifications.length > 0 ? (
          <Group icon={Award01Icon} title="الشهادات والإنجازات">
            <ul className="space-y-3">
              {certifications.map((certification, index) => (
                <CertificationRow
                  key={`${certification.title}-${index}`}
                  certification={certification}
                />
              ))}
            </ul>
          </Group>
        ) : null}
      </div>
    </section>
  )
}
