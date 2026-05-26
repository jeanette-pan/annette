'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { format } from 'date-fns'
import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'
import UserSelector, { useCurrentUser } from '@/components/UserSelector'
import CurrentStatusCard from '@/components/CurrentStatusCard'
import AddStatusModal from '@/components/AddStatusModal'
import DailyTimeline from '@/components/DailyTimeline'
import { getTodayString } from '@/lib/utils'
import { getUserConfig } from '@/lib/statusConfig'
import type { StatusFormData } from '@/components/StatusButtons'

type StatusEntry = {
  id: string
  userId: string
  userName: string
  status: string
  emoji: string
  color: string
  note?: string | null
  startTime: string | Date
  endTime?: string | Date | null
  date: string
  isShared: boolean
}

type CurrentEntries = {
  jeanette: StatusEntry | null
  anthony: StatusEntry | null
}

export default function HomePage() {
  const currentUser = useCurrentUser()
  const [currentEntries, setCurrentEntries] = useState<CurrentEntries>({ jeanette: null, anthony: null })
  const [todayEntries, setTodayEntries] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editEntry, setEditEntry] = useState<StatusEntry | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [undoEntry, setUndoEntry] = useState<{ id: string; label: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const today = getTodayString()

  const userConfig = currentUser ? getUserConfig(currentUser.userId) : null

  const fetchCurrentStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/current')
      const data = await res.json()
      setCurrentEntries(data.entries)
    } catch (err) {
      console.error('Failed to fetch current status', err)
    }
  }, [])

  const fetchTodayEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/status?date=${today}`)
      const data = await res.json()
      setTodayEntries(data.entries)
    } catch (err) {
      console.error('Failed to fetch today entries', err)
    }
  }, [today])

  useEffect(() => {
    fetchCurrentStatus()
    fetchTodayEntries()
    const interval = setInterval(() => {
      fetchCurrentStatus()
      fetchTodayEntries()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchCurrentStatus, fetchTodayEntries])

  const handleStatusSubmit = async (data: StatusFormData) => {
    if (!currentUser) return
    setLoading(true)
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          userName: currentUser.userName,
          status: data.status,
          emoji: data.emoji,
          note: data.note || null,
          color: data.color,
          startTime: data.startTime,
          endTime: data.endTime || null,
          isShared: data.isShared,
        }),
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
      await fetchCurrentStatus()
      await fetchTodayEntries()
    } catch (err) {
      console.error('Failed to update status', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (data: StatusFormData) => {
    if (!editEntry) return
    setEditLoading(true)
    try {
      await fetch(`/api/status/${editEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data.status,
          emoji: data.emoji,
          note: data.note || null,
          color: data.color,
          startTime: new Date(data.startTime).toISOString(),
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          isShared: data.isShared,
        }),
      })
      setEditEntry(null)
      await fetchCurrentStatus()
      await fetchTodayEntries()
    } catch (err) {
      console.error('Failed to edit status', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (entryId: string) => {
    const entry = todayEntries.find(e => e.id === entryId)
    if (!entry) return

    setTodayEntries(prev => prev.filter(e => e.id !== entryId))

    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoEntry({ id: entryId, label: `${entry.emoji} ${entry.status}` })
    undoTimer.current = setTimeout(async () => {
      setUndoEntry(null)
      try {
        await fetch(`/api/status/${entryId}?reopenPrevious=true`, { method: 'DELETE' })
        await fetchCurrentStatus()
        await fetchTodayEntries()
      } catch (err) {
        console.error('Failed to delete status', err)
      }
    }, 8000)
  }

  const handleUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = null
    setUndoEntry(null)
    fetchTodayEntries()
  }

  const editInitialData = editEntry ? {
    id: editEntry.id,
    status: editEntry.status,
    emoji: editEntry.emoji,
    note: editEntry.note ?? '',
    color: editEntry.color,
    startTime: format(new Date(editEntry.startTime), "yyyy-MM-dd'T'HH:mm"),
    endTime: editEntry.endTime
      ? format(new Date(editEntry.endTime), "yyyy-MM-dd'T'HH:mm")
      : undefined,
    isShared: editEntry.isShared,
  } : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-yellow-50 to-green-50">
      <AnimatedBackground />
      <Navbar />
      <UserSelector />

      {/* Success toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-400 text-white font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
          >
            <Check size={16} />
            Status updated! 💜
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo toast */}
      <AnimatePresence>
        {undoEntry && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white font-semibold px-5 py-3 rounded-full shadow-xl flex items-center gap-3"
          >
            <span className="text-sm">Deleted {undoEntry.label}</span>
            <button
              onClick={handleUndo}
              className="text-yellow-300 font-bold text-sm hover:text-yellow-100 transition-colors"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Status Modal */}
      <AddStatusModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleStatusSubmit}
        userId={currentUser?.userId}
        userName={currentUser?.userName}
        userMascot={userConfig?.mascot}
        userButtonClass={userConfig?.buttonClass}
        loading={loading}
        mode="create"
      />

      {/* Edit Status Modal */}
      <AddStatusModal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        onSubmit={handleEditSubmit}
        userId={currentUser?.userId}
        userName={currentUser?.userName}
        userMascot={userConfig?.mascot}
        userButtonClass={userConfig?.buttonClass}
        loading={editLoading}
        mode="edit"
        initialData={editInitialData}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: status cards + add button */}
          <div className="lg:col-span-2 space-y-6">

            {/* Current status for both users */}
            <section>
              <h2 className="text-lg font-bold text-violet-700 mb-4">Current Status ✨</h2>
              <div className="grid grid-cols-2 gap-4">
                <CurrentStatusCard
                  userId="jeanette"
                  userName="Jeanette"
                  entry={currentEntries.jeanette}
                  isMe={currentUser?.userId === 'jeanette'}
                />
                <CurrentStatusCard
                  userId="anthony"
                  userName="Anthony"
                  entry={currentEntries.anthony}
                  isMe={currentUser?.userId === 'anthony'}
                />
              </div>
            </section>

            {/* Add Status button */}
            <section>
              {!currentUser ? (
                <div className="text-center py-8 text-gray-400 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60">
                  <div className="text-3xl mb-2">🐧</div>
                  <p className="font-medium">Select who you are first!</p>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(167,139,250,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddModal(true)}
                  className={`w-full rounded-3xl px-6 py-5 font-bold text-white text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3 ${userConfig?.buttonClass ?? 'bg-violet-400 hover:bg-violet-500'}`}
                >
                  <span className="text-2xl">{userConfig?.mascot}</span>
                  <span>What are you up to? ✨</span>
                </motion.button>
              )}
            </section>
          </div>

          {/* Right: shared live timeline */}
          <div className="lg:col-span-1">
            <DailyTimeline
              entries={todayEntries}
              date={today}
              onEdit={(entry) => setEditEntry(entry as StatusEntry)}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
