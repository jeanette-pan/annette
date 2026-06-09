import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await prisma.bugReport.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('GET /api/bugs error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, title, body, priority } = await request.json()
    if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    const item = await prisma.bugReport.create({
      data: { type: type ?? 'bug', title: title.trim(), body: body?.trim() || null, priority: priority ?? 'medium' },
    })
    return NextResponse.json({ item })
  } catch (error) {
    console.error('POST /api/bugs error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
