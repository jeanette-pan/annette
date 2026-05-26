import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMonthString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getMonthString(new Date())
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const entries = await prisma.statusEntry.findMany({
      where: { userId, date: { startsWith: month } },
      orderBy: { startTime: 'asc' },
    })

    const now = new Date()
    const monthStart = new Date(`${month}-01T00:00:00.000Z`)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const statMap: Record<string, { ms: number; count: number; emoji: string; color: string }> = {}
    let totalMs = 0

    for (const entry of entries) {
      const start = new Date(entry.startTime)
      const end = entry.endTime ? new Date(entry.endTime) : now
      const clampedStart = start < monthStart ? monthStart : start
      const clampedEnd = end > monthEnd ? monthEnd : end
      const durationMs = Math.max(0, clampedEnd.getTime() - clampedStart.getTime())

      if (!statMap[entry.status]) {
        statMap[entry.status] = { ms: 0, count: 0, emoji: entry.emoji, color: entry.color }
      }
      statMap[entry.status].ms += durationMs
      statMap[entry.status].count += 1
      statMap[entry.status].emoji = entry.emoji
      statMap[entry.status].color = entry.color
      totalMs += durationMs
    }

    const totalHours = Math.round((totalMs / 1000 / 3600) * 10) / 10

    const stats: Record<string, { hours: number; percentage: number; count: number; emoji: string; color: string }> = {}
    for (const [status, { ms, count, emoji, color }] of Object.entries(statMap)) {
      const hours = Math.round((ms / 1000 / 3600) * 10) / 10
      const percentage = totalMs > 0 ? Math.round((ms / totalMs) * 1000) / 10 : 0
      stats[status] = { hours, percentage, count, emoji, color }
    }

    return NextResponse.json({ stats, totalHours })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
