import { NextRequest, NextResponse } from 'next/server'
import { SITE_CONFIGS } from '@/lib/sites'

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site') || 'default'
  const config = SITE_CONFIGS[siteId] || SITE_CONFIGS.default
  return NextResponse.json({
    name: config.name,
    greeting: config.greeting,
    primaryColor: config.primaryColor,
    language: config.language,
    fontFamily: config.fontFamily,
    theme: config.theme,
    botEmoji: config.botEmoji,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}
