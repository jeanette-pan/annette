import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST body: { items: [{ id: string, sortOrder: number }] }
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: { id: string; sortOrder: number }[] }
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }
    await prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.statusTemplate.update({ where: { id }, data: { sortOrder } })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/templates/reorder error:', error)
    return NextResponse.json({ error: 'Failed to reorder templates' }, { status: 500 })
  }
}
