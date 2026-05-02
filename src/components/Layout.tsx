import type { ReactNode, CSSProperties } from 'react'

interface Props {
  children: ReactNode
  toc: ReactNode
  accent: string
  footerText: string
}

export function Layout({ children, toc, accent, footerText }: Props) {
  const style = { ['--accent' as string]: accent } as CSSProperties
  return (
    <div className="layout" style={style}>
      <main className="main">
        {children}
        <div className="footer">{footerText}</div>
      </main>
      {toc}
    </div>
  )
}
