import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const QS_USER = '__qs__'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { label, emoji } = await request.json()
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })
    const item = await prisma.statusTemplate.update({
      where: { id: params.id, userId: QS_USER },
      data: { status: label, emoji: emoji || '✨' },
    })
    return NextResponse.json({ item: { id: item.id, label: item.status, emoji: item.emoji, sortOrder: item.sortOrder } })
  } catch (error) {
    console.error('PUT /api/quick-statuses/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.statusTemplate.delete({
      where: { id: params.id, userId: QS_USER },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/quick-statuses/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
