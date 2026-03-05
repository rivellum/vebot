import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { SITE_CONFIGS } from '@/lib/sites'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabase = process.env.SUPABASE_URL
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!)
  : null

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

    const config = SITE_CONFIGS[siteId] || SITE_CONFIGS.default

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: config.systemPrompt },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    })

    // Log to Supabase async (don't await — don't block response)
    if (supabase && sessionId) {
      supabase.from('chat_sessions').upsert({
        session_id: sessionId,
        site_id: siteId,
        message_count: (history.length || 0) + 1,
        last_message: message.slice(0, 200),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).then(() => {})
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
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
  } catch (err) {
    console.error('Chat error:', err)
    return Response.json({ error: 'Chat error' }, { status: 500 })
  }
}
