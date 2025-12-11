// Load Notes API Route
// GET: Get all notes for a load
// POST: Create a new note

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/load-requests/[id]/notes
 * Get all notes for a load request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const notes = await prisma.loadNote.findMany({
      where: { loadRequestId: id },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/load-requests/[id]/notes
 * Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, isInternal, createdBy, createdByType } = body

    if (!content || !createdBy || !createdByType) {
      return NextResponse.json(
        { error: 'Missing required fields: content, createdBy, createdByType' },
        { status: 400 }
      )
    }

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    const note = await prisma.loadNote.create({
      data: {
        loadRequestId: id,
        content,
        isInternal: isInternal || false,
        createdBy,
        createdByType,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}


