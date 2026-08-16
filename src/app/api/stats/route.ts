import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CATEGORIES } from '@/lib/categoryConfig'
import { zonedMidnightUtc, zonedDateStr, nextDateStr, addDaysToDateStr } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const colorToCategory = new Map(CATEGORIES.map(c => [c.color, c]))

type StatEntry = {
  minutes: number
  count: number
  emoji: string
  color: string
  categoryId: string
  longestSessionMinutes: number
}

function getDateRange(params: URLSearchParams, tz: string): { start: Date; end: Date; periodDays: number } | null {
  const period = params.get('period') ?? 'monthly'

  if (period === 'daily') {
    const dateStr = params.get('date') ?? zonedDateStr(new Date(), tz)
    const start = zonedMidnightUtc(dateStr, tz)
    const end = zonedMidnightUtc(nextDateStr(dateStr), tz)
    return { start, end, periodDays: 1 }
  }

  if (period === 'weekly') {
    const weekStart = params.get('weekStart') ?? zonedDateStr(new Date(), tz)
    const start = zonedMidnightUtc(weekStart, tz)
    const end = zonedMidnightUtc(addDaysToDateStr(weekStart, 7), tz)
    return { start, end, periodDays: 7 }
  }

  if (period === 'monthly') {
    const month = params.get('month') ?? zonedDateStr(new Date(), tz).substring(0, 7)
    const [y, m] = month.split('-').map(Number)
    const startStr = `${y}-${String(m).padStart(2, '0')}-01`
    const nextMonthStr = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const start = zonedMidnightUtc(startStr, tz)
    const end = zonedMidnightUtc(nextMonthStr, tz)
    const periodDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    return { start, end, periodDays }
  }

  if (period === 'yearly') {
    const year = params.get('year') ?? zonedDateStr(new Date(), tz).substring(0, 4)
    const y = Number(year)
    const start = zonedMidnightUtc(`${y}-01-01`, tz)
    const end = zonedMidnightUtc(`${y + 1}-01-01`, tz)
    const periodDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    return { start, end, periodDays }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    // Viewer's IANA timezone — period boundaries and the daily breakdown are
    // computed against it so "today"/"this week" match the viewer's own clock.
    const tz = searchParams.get('tz') || 'UTC'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const range = getDateRange(searchParams, tz)
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

    const dailyMap: Record<string, Record<string, { status: string; emoji: string; color: string; minutes: number }>> = {}

    for (const entry of entries) {
      const entryStart = new Date(entry.startTime)
      const entryEnd = entry.endTime ? new Date(entry.endTime) : now

      const clampedStart = entryStart < start ? start : entryStart
      const clampedEnd = entryEnd > end ? end : entryEnd

      if (clampedEnd <= clampedStart) continue

      const durationMs = clampedEnd.getTime() - clampedStart.getTime()
      const durationMinutes = Math.floor(durationMs / 60000)

      const cat = colorToCategory.get(entry.color)
      const catLabel = cat?.label ?? 'Other'
      const catId = cat?.id ?? 'other'
      const catEmoji = cat?.emoji ?? entry.emoji
      const catColor = cat?.color ?? entry.color

      if (!statMap[catLabel]) {
        statMap[catLabel] = { minutes: 0, count: 0, emoji: catEmoji, color: catColor, categoryId: catId, longestSessionMinutes: 0 }
      }
      statMap[catLabel].minutes += durationMinutes
      statMap[catLabel].count += 1
      if (durationMinutes > statMap[catLabel].longestSessionMinutes) {
        statMap[catLabel].longestSessionMinutes = durationMinutes
      }
      totalMinutes += durationMinutes

      let cursor = new Date(clampedStart)
      while (cursor < clampedEnd) {
        const dateStr = zonedDateStr(cursor, tz)
        const dayStart = zonedMidnightUtc(dateStr, tz)
        const dayEnd = zonedMidnightUtc(nextDateStr(dateStr), tz)

        const segStart = cursor > dayStart ? cursor : dayStart
        const segEnd = clampedEnd < dayEnd ? clampedEnd : dayEnd
        const segMinutes = Math.floor((segEnd.getTime() - segStart.getTime()) / 60000)

        if (!dailyMap[dateStr]) dailyMap[dateStr] = {}
        if (!dailyMap[dateStr][catLabel]) {
          dailyMap[dateStr][catLabel] = { status: catLabel, emoji: catEmoji, color: catColor, minutes: 0 }
        }
        dailyMap[dateStr][catLabel].minutes += segMinutes

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
      categoryId: string
      avgMinutesPerDay: number
      longestSessionMinutes: number
    }> = {}

    for (const [label, data] of Object.entries(statMap)) {
      const hours = Math.round((data.minutes / 60) * 10) / 10
      const percentage = totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 1000) / 10 : 0
      stats[label] = {
        hours,
        minutes: data.minutes,
        percentage,
        count: data.count,
        emoji: data.emoji,
        color: data.color,
        categoryId: data.categoryId,
        avgMinutesPerDay: periodDays > 0 ? Math.round(data.minutes / periodDays) : 0,
        longestSessionMinutes: data.longestSessionMinutes,
      }
    }

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
