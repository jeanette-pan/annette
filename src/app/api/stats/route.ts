import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type StatEntry = {
  minutes: number
  count: number
  emoji: string
  color: string
  longestSessionMinutes: number
}

function getDateRange(params: URLSearchParams): { start: Date; end: Date; periodDays: number } | null {
  const period = params.get('period') ?? 'monthly'

  if (period === 'daily') {
    const dateStr = params.get('date') ?? new Date().toISOString().substring(0, 10)
    const start = new Date(`${dateStr}T00:00:00.000Z`)
    // Use local midnight by treating the date string as UTC
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    return { start, end, periodDays: 1 }
  }

  if (period === 'weekly') {
    const weekStart = params.get('weekStart') ?? new Date().toISOString().substring(0, 10)
    const start = new Date(`${weekStart}T00:00:00.000Z`)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    return { start, end, periodDays: 7 }
  }

  if (period === 'monthly') {
    const month = params.get('month') ?? new Date().toISOString().substring(0, 7)
    const [y, m] = month.split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    const periodDays = (end.getTime() - start.getTime()) / 86400000
    return { start, end, periodDays }
  }

  if (period === 'yearly') {
    const year = params.get('year') ?? String(new Date().getFullYear())
    const y = Number(year)
    const start = new Date(Date.UTC(y, 0, 1))
    const end = new Date(Date.UTC(y + 1, 0, 1))
    const periodDays = (end.getTime() - start.getTime()) / 86400000
    return { start, end, periodDays }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const range = getDateRange(searchParams)
    if (!range) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    const { start, end, periodDays } = range

    const entries = await prisma.statusEntry.findMany({
      where: {
        userId,
        startTime: { lt: end },
        OR: [
          { endTime: null },
          { endTime: { gt: start } },
        ],
      },
      orderBy: { startTime: 'asc' },
    })

    const now = new Date()
    const statMap: Record<string, StatEntry> = {}
    let totalMinutes = 0

    // Build daily breakdown map: date -> status -> minutes
    const dailyMap: Record<string, Record<string, { status: string; emoji: string; color: string; minutes: number }>> = {}

    for (const entry of entries) {
      const entryStart = new Date(entry.startTime)
      const entryEnd = entry.endTime ? new Date(entry.endTime) : now

      // Clamp to the period range
      const clampedStart = entryStart < start ? start : entryStart
      const clampedEnd = entryEnd > end ? end : entryEnd

      if (clampedEnd <= clampedStart) continue

      const durationMs = clampedEnd.getTime() - clampedStart.getTime()
      const durationMinutes = Math.floor(durationMs / 60000)

      if (!statMap[entry.status]) {
        statMap[entry.status] = { minutes: 0, count: 0, emoji: entry.emoji, color: entry.color, longestSessionMinutes: 0 }
      }
      statMap[entry.status].minutes += durationMinutes
      statMap[entry.status].count += 1
      statMap[entry.status].emoji = entry.emoji
      statMap[entry.status].color = entry.color
      if (durationMinutes > statMap[entry.status].longestSessionMinutes) {
        statMap[entry.status].longestSessionMinutes = durationMinutes
      }
      totalMinutes += durationMinutes

      // Distribute to daily breakdown (split at midnight boundaries)
      let cursor = new Date(clampedStart)
      while (cursor < clampedEnd) {
        const dayStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()))
        const dayEnd = new Date(dayStart)
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

        const segStart = cursor > dayStart ? cursor : dayStart
        const segEnd = clampedEnd < dayEnd ? clampedEnd : dayEnd
        const segMinutes = Math.floor((segEnd.getTime() - segStart.getTime()) / 60000)

        const dateStr = dayStart.toISOString().substring(0, 10)
        if (!dailyMap[dateStr]) dailyMap[dateStr] = {}
        if (!dailyMap[dateStr][entry.status]) {
          dailyMap[dateStr][entry.status] = { status: entry.status, emoji: entry.emoji, color: entry.color, minutes: 0 }
        }
        dailyMap[dateStr][entry.status].minutes += segMinutes

        cursor = new Date(dayEnd)
      }
    }

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10

    const stats: Record<string, {
      hours: number
      minutes: number
      percentage: number
      count: number
      emoji: string
      color: string
      avgMinutesPerDay: number
      longestSessionMinutes: number
    }> = {}

    for (const [status, data] of Object.entries(statMap)) {
      const hours = Math.round((data.minutes / 60) * 10) / 10
      const percentage = totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 1000) / 10 : 0
      stats[status] = {
        hours,
        minutes: data.minutes,
        percentage,
        count: data.count,
        emoji: data.emoji,
        color: data.color,
        avgMinutesPerDay: periodDays > 0 ? Math.round(data.minutes / periodDays) : 0,
        longestSessionMinutes: data.longestSessionMinutes,
      }
    }

    // Build dailyBreakdown array
    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, statusMap]) => ({
        date,
        entries: Object.values(statusMap).sort((a, b) => b.minutes - a.minutes),
      }))

    return NextResponse.json({ stats, totalHours, totalMinutes, periodDays, dailyBreakdown })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
