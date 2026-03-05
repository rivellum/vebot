export default function Home() {
  return (
    <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖 VeBot</h1>
      <p style={{ color: '#888', marginBottom: '32px' }}>Embeddable AI chat widget — Prospera / VeSeguro / ThornGrade</p>
      
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Quick Embed</h2>
      <pre style={{ background: '#111', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem' }}>
{`<!-- ThornGrade -->
<script
  src="https://vebot.veseguro.com/chat.js"
  data-site="thorngrade"
></script>

<!-- QuéMeCubre -->
<script
  src="https://vebot.veseguro.com/chat.js"
  data-site="quemecubre"
></script>`}
      </pre>
      
      <h2 style={{ fontSize: '1.25rem', margin: '32px 0 16px' }}>Available Sites</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {['thorngrade', 'quemecubre', 'pasatucedula', 'veseguro', 'prosperaseguros'].map(site => (
          <li key={site} style={{ padding: '12px 16px', background: '#111', borderRadius: '8px', fontFamily: 'monospace' }}>
            {site}
          </li>
        ))}
      </ul>
    </main>
  )
}
