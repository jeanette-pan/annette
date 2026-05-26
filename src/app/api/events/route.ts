import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const month = searchParams.get('month')
  const where: Record<string, unknown> = {}
  if (month) where.date = { startsWith: month }
  else if (date) where.date = date
  const events = await prisma.calendarEvent.findMany({ where, orderBy: { date: 'asc' } })
  return NextResponse.json({ events })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, date, startTime, endTime, note, color, eventType, isShared } = body
    if (!title || !date) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        note: note || null,
        color: color || '#d1fae5',
        eventType: eventType || 'event',
        isShared: isShared ?? true,
      },
    })
    return NextResponse.json({ event })
  } catch (error) {
    console.error('POST /api/events error:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
