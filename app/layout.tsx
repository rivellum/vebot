import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VeBot — AI Chat Widget',
  description: 'Embeddable AI chat widget for Prospera/VeSeguro/ThornGrade sites',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
