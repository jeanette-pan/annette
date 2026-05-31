import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const QS_USER = '__qs__'
const SEEDED_MARKER_V2 = '__seeded_v2__'

// On first call: wipe all auto-seeded defaults and mark initialized.
// Sentinel guarantees this runs exactly once; no defaults are ever re-created.
async function ensureInitialized() {
  const marker = await prisma.statusTemplate.findFirst({
    where: { userId: QS_USER, name: SEEDED_MARKER_V2 },
  })
  if (marker) return

  try {
    await prisma.statusTemplate.deleteMany({ where: { userId: QS_USER } })
    await prisma.statusTemplate.create({
      data: { userId: QS_USER, name: SEEDED_MARKER_V2, status: 'initialized', emoji: '✓', sortOrder: 0 },
    })
  } catch { /* race condition: another request initialized concurrently — fine */ }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })
    await ensureInitialized()
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
