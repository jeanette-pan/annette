import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const userIds = ['jeanette', 'anthony']
    const entries: Record<string, object | null> = {}

    for (const userId of userIds) {
      const entry = await prisma.statusEntry.findFirst({
        where: { userId, endTime: null },
        orderBy: { startTime: 'desc' },
      })
      entries[userId] = entry
    }

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('GET /api/current error:', error)
    return NextResponse.json({ error: 'Failed to fetch current status' }, { status: 500 })
  }
}
