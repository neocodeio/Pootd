import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SecurityCheckIcon } from '@hugeicons/core-free-icons'
import type { Certification } from '@/lib/types'
import { CertificationsEditor, LabelListEditor } from './expertise-editor'

afterEach(cleanup)

function LabelsHarness({ initial = [] }: { initial?: string[] }) {
  const [values, setValues] = useState(initial)

  return (
    <LabelListEditor
      id="skills"
      label="المهارات"
      icon={SecurityCheckIcon}
      placeholder="أضف مهارة"
      values={values}
      onChange={setValues}
    />
  )
}

function CertificationsHarness() {
  const [rows, setRows] = useState<Certification[]>([])

  return <CertificationsEditor rows={rows} onChange={setRows} />
}

describe('LabelListEditor', () => {
  it('adds a trimmed chip with Enter and updates the counter', () => {
    render(<LabelsHarness />)
    const input = screen.getByLabelText('المهارات')

    fireEvent.change(input, { target: { value: '  أمن   الشبكات  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('أمن الشبكات')).toBeTruthy()
    expect(screen.getByText('1/12')).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('adds a chip with a comma', () => {
    render(<LabelsHarness />)
    const input = screen.getByLabelText('المهارات')

    fireEvent.change(input, { target: { value: 'Nmap' } })
    fireEvent.keyDown(input, { key: ',' })

    expect(screen.getByText('Nmap')).toBeTruthy()
  })

  it('rejects a duplicate regardless of case', () => {
    render(<LabelsHarness initial={['Nmap']} />)
    const input = screen.getByLabelText('المهارات')

    fireEvent.change(input, { target: { value: 'nmap' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('alert').textContent).toBe('«nmap» موجود مسبقًا.')
    expect(document.querySelectorAll('ul li')).toHaveLength(1)
  })

  it('removes a chip from its button', () => {
    render(<LabelsHarness initial={['Nmap', 'Wireshark']} />)

    fireEvent.click(screen.getByRole('button', { name: 'حذف Nmap' }))

    expect(screen.queryByText('Nmap')).toBeNull()
    expect(screen.getByText('Wireshark')).toBeTruthy()
  })

  it('removes the last chip with Backspace on an empty field', () => {
    render(<LabelsHarness initial={['Nmap']} />)

    fireEvent.keyDown(screen.getByLabelText('المهارات'), { key: 'Backspace' })

    expect(screen.queryByText('Nmap')).toBeNull()
  })
})

describe('CertificationsEditor', () => {
  it('adds a row, accepts Arabic-Indic digits in the year and removes it', () => {
    render(<CertificationsHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'إضافة شهادة' }))

    const title = screen.getByLabelText('اسم الشهادة 1')
    const year = screen.getByLabelText('سنة الشهادة 1') as HTMLInputElement
    fireEvent.change(title, { target: { value: 'OSCP' } })
    fireEvent.change(year, { target: { value: '٢٠٢٤' } })

    expect(year.value).toBe('2024')
    expect(screen.getByText('1/6')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'حذف الشهادة أو الإنجاز 1' }),
    )
    expect(screen.queryByLabelText('اسم الشهادة 1')).toBeNull()
  })

  it('disables adding a seventh award', () => {
    render(<CertificationsHarness />)

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'إضافة شهادة' }))
    }

    expect(screen.getByText('6/6')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'إضافة شهادة' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
