import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/emotions?userId=X[&date=YYYY-MM-DD][&from=YYYY-MM-DD&to=YYYY-MM-DD]
// Always includes one day before the start so callers can determine the emotion
// that was already active at the beginning of the requested window.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    let from: Date | undefined
    const date = searchParams.get('date')
    const fromParam = searchParams.get('from')

    if (date) {
      // Single-day request: start one calendar day before to capture carry-over emotion
      from = new Date(date + 'T00:00:00')
      from.setDate(from.getDate() - 1)
    } else if (fromParam) {
      from = new Date(fromParam + 'T00:00:00')
      from.setDate(from.getDate() - 1)
    }

    const entries = await prisma.emotionEntry.findMany({
      where: {
        userId,
        ...(from ? { startTime: { gte: from } } : {}),
      },
      orderBy: { startTime: 'asc' },
      select: { id: true, userId: true, emotion: true, startTime: true },
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('GET /api/emotions error:', error)
    return NextResponse.json({ error: 'Failed to fetch emotions' }, { status: 500 })
  }
}

// POST /api/emotions  { userId, emotion }
export async function POST(request: NextRequest) {
  try {
    const { userId, emotion } = await request.json() as { userId: string; emotion: string }
    if (!userId || !emotion) {
      return NextResponse.json({ error: 'userId and emotion required' }, { status: 400 })
    }
    const entry = await prisma.emotionEntry.create({
      data: { userId, emotion },
    })
    return NextResponse.json({ entry })
  } catch (error) {
    console.error('POST /api/emotions error:', error)
    return NextResponse.json({ error: 'Failed to save emotion' }, { status: 500 })
  }
}
