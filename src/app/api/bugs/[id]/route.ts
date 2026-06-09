import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.priority !== undefined) data.priority = body.priority
    if (body.title !== undefined) data.title = body.title
    if (body.body !== undefined) data.body = body.body
    const item = await prisma.bugReport.update({ where: { id: params.id }, data })
    return NextResponse.json({ item })
  } catch (error) {
    console.error('PATCH /api/bugs/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.bugReport.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/bugs/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
