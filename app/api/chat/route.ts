import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SITE_CONFIGS } from '@/lib/sites'

export const runtime = 'nodejs'
export const maxDuration = 30

function getSupabase() {
  if (!process.env.SUPABASE_URL) return null
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!)
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { siteId = 'default', message, sessionId, history = [] } = body

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return Response.json({ error: 'Invalid message' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing API key' }, { status: 500 })
    }

    const config = SITE_CONFIGS[siteId] || SITE_CONFIGS.default

    const messages = [
      { role: 'system', content: config.systemPrompt },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    // Use native fetch instead of OpenAI SDK to avoid Vercel connection issues
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI API error:', openaiRes.status, errText)
      return Response.json({ error: 'AI error', status: openaiRes.status }, { status: 502 })
    }

    // Log to Supabase async
    const supabase = getSupabase()
    if (supabase && sessionId) {
      supabase.from('chat_sessions').upsert({
        session_id: sessionId,
        site_id: siteId,
        message_count: (history.length || 0) + 1,
        last_message: message.slice(0, 200),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).then(() => {})
    }

    // Stream the response through
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = openaiRes.body!.getReader()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  continue
                }
                try {
                  const parsed = JSON.parse(data)
                  const text = parsed.choices?.[0]?.delta?.content || ''
                  if (text) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                  }
                } catch {}
              }
            }
          }
          controller.close()
        } catch (e) {
          controller.error(e)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('Chat error:', err?.message || err)
    return Response.json({ error: 'Chat error' }, { status: 500 })
  }
}
