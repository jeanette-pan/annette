import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { note, endTime } = body

    const updateData: { note?: string | null; endTime?: Date | null } = {}
    if (note !== undefined) updateData.note = note
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null

    const entry = await prisma.statusEntry.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('PUT /api/status/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}
