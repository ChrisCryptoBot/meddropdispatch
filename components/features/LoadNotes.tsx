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
  updatedAt?: string
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

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (note: LoadNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim() || !canEdit) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/load-requests/${loadRequestId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      })

      if (response.ok) {
        setEditingNoteId(null)
        setEditContent('')
        fetchNotes()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to update note')
      }
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to update note')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
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
                    {note.updatedAt && note.updatedAt !== note.createdAt && (
                      <span className="ml-1">(edited)</span>
                    )}
                  </span>
                </div>
                {canEdit && note.createdBy === currentUserId && (
                  <div className="flex items-center gap-2">
                    {editingNoteId === note.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={isSaving || !editContent.trim()}
                          className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="text-gray-600 hover:text-gray-700 text-sm disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(note)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {editingNoteId === note.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  autoFocus
                />
              ) : (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
              )}
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


