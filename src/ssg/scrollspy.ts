export interface SectionMeasure {
  id: string
  offsetTop: number
  height: number
}

export function computeActiveSection(
  sections: SectionMeasure[],
  scrollY: number,
  viewportThreshold = 80
): string | null {
  if (sections.length === 0) return null
  const probe = scrollY + viewportThreshold
  let active: string | null = null
  for (const s of sections) {
    if (s.offsetTop <= probe) active = s.id
  }
  return active ?? sections[0]!.id
}

export function mountScrollspy(): () => void {
  const measure = (): SectionMeasure[] =>
    Array.from(document.querySelectorAll<HTMLElement>('section[id]')).map((el) => ({
      id: el.id,
      offsetTop: el.offsetTop,
      height: el.offsetHeight,
    }))

  const tocItems = Array.from(
    document.querySelectorAll<HTMLLIElement>('[data-toc] [data-toc-target]')
  )

  let last: string | null = null
  const update = () => {
    const active = computeActiveSection(measure(), window.scrollY)
    if (active === last) return
    last = active
    tocItems.forEach((li) => {
      li.classList.toggle('active', li.dataset.tocTarget === active)
    })
  }

  tocItems.forEach((li) => {
    li.addEventListener('click', () => {
      const target = document.getElementById(li.dataset.tocTarget!)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)

  return () => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  }
}
