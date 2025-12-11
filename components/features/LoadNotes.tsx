'use client'

// Load Notes Component
// Display and manage notes for a load request

import { useState, useEffect } from 'react'

interface LoadNote {
  id: string
  content: string
  isInternal: boolean
  createdBy: string
  createdByType: string
  createdAt: string
}

interface LoadNotesProps {
  loadRequestId: string
  currentUserId: string
  currentUserType: 'ADMIN' | 'DRIVER' | 'SHIPPER'
  canEdit?: boolean
}

export default function LoadNotes({
  loadRequestId,
  currentUserId,
  currentUserType,
  canEdit = true,
}: LoadNotesProps) {
  const [notes, setNotes] = useState<LoadNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [loadRequestId])

  const fetchNotes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/load-requests/${loadRequestId}/notes`)
      if (response.ok) {
        const data = await response.json()
        // Filter notes based on user type and internal flag
        const filteredNotes = data.notes.filter((note: LoadNote) => {
          if (!note.isInternal) return true // Public notes visible to all
          if (currentUserType === 'ADMIN' || currentUserType === 'DRIVER') return true // Internal notes visible to admin/driver
          return false // Internal notes not visible to shipper
        })
        setNotes(filteredNotes)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !canEdit) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/load-requests/${loadRequestId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote.trim(),
          isInternal,
          createdBy: currentUserId,
          createdByType: currentUserType,
        }),
      })

      if (response.ok) {
        setNewNote('')
        setIsInternal(false)
        fetchNotes()
      } else {
        alert('Failed to add note')
      }
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    if (!canEdit) return

    try {
      const response = await fetch(`/api/load-requests/${loadRequestId}/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchNotes()
      } else {
        alert('Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notes List */}
      {notes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-3 rounded-lg border ${
                note.isInternal
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    {note.createdByType}
                  </span>
                  {note.isInternal && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                      Internal
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                {canEdit && note.createdBy === currentUserId && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Form */}
      {canEdit && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {currentUserType === 'ADMIN' || currentUserType === 'DRIVER' ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isInternal"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isInternal" className="text-sm text-gray-600">
                Internal note (not visible to shipper)
              </label>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={!newNote.trim() || isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </form>
      )}
    </div>
  )
}


