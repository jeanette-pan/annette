import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTodayString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function prevDateStr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().substring(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const month = searchParams.get('month')
    const userId = searchParams.get('userId')

    const userFilter = userId ? { userId } : {}

    if (month) {
      const entries = await prisma.statusEntry.findMany({
        where: { ...userFilter, date: { startsWith: month } },
        orderBy: { startTime: 'asc' },
      })
      return NextResponse.json({ entries })
    }

    const dateStr = date || getTodayString()
    const prevDate = prevDateStr(dateStr)
    // Approximate UTC start of the requested date — used to identify
    // entries that started the previous local day but cross midnight.
    const dayStartUtc = new Date(dateStr + 'T00:00:00Z')

    const entries = await prisma.statusEntry.findMany({
      where: {
        ...userFilter,
        OR: [
          // Normal: entry is tagged to this local date
          { date: dateStr },
          // Cross-midnight: entry started the previous local day but hasn't
          // ended before this date's UTC midnight (or is still open)
          {
            date: prevDate,
            OR: [
              { endTime: null },
              { endTime: { gt: dayStartUtc } },
            ],
          },
        ],
      },
      orderBy: { startTime: 'asc' },
    })

    // Safeguard: among open entries (endTime: null), only keep the most recent
    // one per user. Older open entries are stale — they should have been closed
    // by the POST handler but can persist via edge cases or stale data. These
    // cause phantom blocks spanning many hours on the timeline.
    // entries is already sorted asc by startTime, so iterating and overwriting
    // naturally leaves the latest ID for each user in the map.
    const openEntries = entries.filter(e => !e.endTime)
    if (openEntries.length > 1) {
      const latestOpenIdByUser = new Map<string, string>()
      for (const e of openEntries) latestOpenIdByUser.set(e.userId, e.id)
      const keepOpenIds = new Set(latestOpenIdByUser.values())
      const staleIds = new Set(openEntries.filter(e => !keepOpenIds.has(e.id)).map(e => e.id))
      if (staleIds.size > 0) {
        return NextResponse.json({ entries: entries.filter(e => !staleIds.has(e.id)) })
      }
    }

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
    const dateStr = localDate || (startTime ? startTime.substring(0, 10) : getTodayString())

    // Close the previous open entry only when this new entry has no explicit end time
    // (i.e. it's the new current status). Retroactive entries with an endTime already
    // set are purely historical and should not disturb whatever is currently active.
    if (!parsedEnd) {
      const openEntry = await prisma.statusEntry.findFirst({
        where: { userId, endTime: null, startTime: { lt: parsedStart } },
        orderBy: { startTime: 'desc' },
      })
      if (openEntry) {
        await prisma.statusEntry.update({
          where: { id: openEntry.id },
          data: { endTime: parsedStart },
        })
      }
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
