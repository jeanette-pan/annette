import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/emotions/current?userId=X
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const entry = await prisma.emotionEntry.findFirst({
      where: { userId },
      orderBy: { startTime: 'desc' },
      select: { emotion: true },
    })

    return NextResponse.json({ emotion: entry?.emotion ?? null })
  } catch (error) {
    console.error('GET /api/emotions/current error:', error)
    return NextResponse.json({ error: 'Failed to fetch current emotion' }, { status: 500 })
  }
}
