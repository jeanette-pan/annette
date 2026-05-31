import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUICK_STATUSES } from '@/lib/quickStatuses'

export const dynamic = 'force-dynamic'

const QS_USER = '__qs__'
const SEEDED_MARKER = '__seeded__'

// Seeds all categories once on first ever call; never re-seeds after that.
// Using a sentinel record so deletions don't trigger re-seeding.
async function ensureAllSeeded() {
  const marker = await prisma.statusTemplate.findFirst({
    where: { userId: QS_USER, name: SEEDED_MARKER },
  })
  if (marker) return

  // Count existing items (may exist from a prior per-category seeding implementation)
  const existingCount = await prisma.statusTemplate.count({ where: { userId: QS_USER } })

  if (existingCount === 0) {
    const allDefaults = Object.entries(QUICK_STATUSES).flatMap(([catId, items]) =>
      items.map((qs, i) => ({
        userId: QS_USER,
        name: catId,
        status: qs.label,
        emoji: qs.emoji,
        sortOrder: i,
      }))
    )
    await prisma.statusTemplate.createMany({ data: allDefaults })
  }

  try {
    await prisma.statusTemplate.create({
      data: { userId: QS_USER, name: SEEDED_MARKER, status: 'seeded', emoji: '✓', sortOrder: 0 },
    })
  } catch { /* race condition on first simultaneous request — fine */ }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })
    await ensureAllSeeded()
    const items = await prisma.statusTemplate.findMany({
      where: { userId: QS_USER, name: category },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({
      items: items.map(i => ({ id: i.id, label: i.status, emoji: i.emoji, sortOrder: i.sortOrder })),
    })
  } catch (error) {
    console.error('GET /api/quick-statuses error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category, label, emoji } = await request.json()
    if (!category || !label) return NextResponse.json({ error: 'category and label required' }, { status: 400 })
    const agg = await prisma.statusTemplate.aggregate({
      where: { userId: QS_USER, name: category },
      _max: { sortOrder: true },
    })
    const sortOrder = (agg._max.sortOrder ?? -1) + 1
    const item = await prisma.statusTemplate.create({
      data: { userId: QS_USER, name: category, status: label, emoji: emoji || '✨', sortOrder },
    })
    return NextResponse.json({ item: { id: item.id, label: item.status, emoji: item.emoji, sortOrder: item.sortOrder } })
  } catch (error) {
    console.error('POST /api/quick-statuses error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orderedIds } = await request.json()
    if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })
    await Promise.all(
      orderedIds.map((id: string, i: number) =>
        prisma.statusTemplate.update({ where: { id }, data: { sortOrder: i } })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/quick-statuses error:', error)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
