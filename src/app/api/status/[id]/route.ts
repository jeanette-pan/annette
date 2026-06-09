import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { note, endTime, status, emoji, color, startTime, isShared, localDate } = body
    const updateData: Record<string, unknown> = {}
    if (note !== undefined) updateData.note = note
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null
    if (status !== undefined) updateData.status = status
    if (emoji !== undefined) updateData.emoji = emoji
    if (color !== undefined) updateData.color = color
    if (startTime !== undefined) updateData.startTime = new Date(startTime)
    if (isShared !== undefined) updateData.isShared = isShared
    if (localDate !== undefined) updateData.date = localDate
    const entry = await prisma.statusEntry.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json({ entry })
  } catch (error) {
    console.error('PUT /api/status/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const reopenPrevious = searchParams.get('reopenPrevious') === 'true'

    const entry = await prisma.statusEntry.findUnique({ where: { id: params.id } })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.statusEntry.delete({ where: { id: params.id } })

    if (reopenPrevious) {
      // Find the entry that was closed when this one was created:
      // same user, started before this entry, and ended right when this one started.
      const entryStart = new Date(entry.startTime)
      const previous = await prisma.statusEntry.findFirst({
        where: {
          userId: entry.userId,
          id: { not: entry.id },
          startTime: { lt: entryStart },
          endTime: {
            gte: new Date(entryStart.getTime() - 60000),
            lte: new Date(entryStart.getTime() + 60000),
          },
        },
        orderBy: { startTime: 'desc' },
      })
      if (previous) {
        await prisma.statusEntry.update({ where: { id: previous.id }, data: { endTime: null } })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/status/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
