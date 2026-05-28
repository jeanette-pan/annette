import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTodayString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const month = searchParams.get('month')
    const userId = searchParams.get('userId')

    const where: { date?: string | { startsWith: string }; userId?: string } = {}
    if (month) {
      where.date = { startsWith: month }
    } else {
      where.date = date || getTodayString()
    }
    if (userId) where.userId = userId

    const entries = await prisma.statusEntry.findMany({
      where,
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('GET /api/status error:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userName, status, emoji, note, color, startTime, endTime, isShared, localDate } = body

    if (!userId || !userName || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedStart = startTime ? new Date(startTime) : new Date()
    const parsedEnd = endTime ? new Date(endTime) : null
    // localDate is the YYYY-MM-DD in the user's local timezone, sent from the browser
    const dateStr = localDate || (startTime ? startTime.substring(0, 10) : getTodayString())

    // Close the previous open entry only when this new entry has no explicit end time
    // (i.e. it's the new current status). Retroactive entries with an endTime already
    // set are purely historical and should not disturb whatever is currently active.
    // Also only close entries whose startTime <= parsedStart to avoid negative durations.
    if (!parsedEnd) {
      await prisma.statusEntry.updateMany({
        where: { userId, endTime: null, startTime: { lte: parsedStart } },
        data: { endTime: parsedStart },
      })
    }

    const entry = await prisma.statusEntry.create({
      data: {
        userId,
        userName,
        status,
        emoji: emoji || '✨',
        color: color || '#e9d5ff',
        note: note || null,
        startTime: parsedStart,
        endTime: parsedEnd,
        date: dateStr,
        isShared: isShared ?? false,
      },
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('POST /api/status error:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
