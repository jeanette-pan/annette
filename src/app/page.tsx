'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'
import UserSelector, { useCurrentUser } from '@/components/UserSelector'
import CurrentStatusCard from '@/components/CurrentStatusCard'
import StatusButtons from '@/components/StatusButtons'
import CustomStatusModal from '@/components/CustomStatusModal'
import DailyTimeline from '@/components/DailyTimeline'
import { getTodayString } from '@/lib/utils'

type StatusEntry = {
  id: string
  userId: string
  userName: string
  status: string
  emoji: string
  note?: string | null
  startTime: string | Date
  endTime?: string | Date | null
  date: string
}

type CurrentEntries = {
  jeanette: StatusEntry | null
  partner: StatusEntry | null
}

export default function HomePage() {
  const currentUser = useCurrentUser()
  const [currentEntries, setCurrentEntries] = useState<CurrentEntries>({ jeanette: null, partner: null })
  const [todayEntries, setTodayEntries] = useState<StatusEntry[]>([])
  const [note, setNote] = useState('')
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const today = getTodayString()

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
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchCurrentStatus()
      fetchTodayEntries()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchCurrentStatus, fetchTodayEntries])

  const handleStatusUpdate = async (status: string, emoji: string) => {
    if (!currentUser) return
    setLoading(true)
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          userName: currentUser.userName,
          status,
          emoji,
          note: note.trim() || null,
        }),
      })
      setNote('')
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

  const handleCustomSubmit = async (status: string, emoji: string, customNote: string) => {
    if (!currentUser) return
    setLoading(true)
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          userName: currentUser.userName,
          status,
          emoji,
          note: customNote || note.trim() || null,
        }),
      })
      setNote('')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-yellow-50 to-green-50">
      <AnimatedBackground />
      <Navbar />
      <UserSelector />
      <CustomStatusModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSubmit={handleCustomSubmit}
      />

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
            Status updated!
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: status cards + update UI */}
          <div className="lg:col-span-2 space-y-6">

            {/* Current Status */}
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
                  userId="partner"
                  userName="Partner"
                  entry={currentEntries.partner}
                  isMe={currentUser?.userId === 'partner'}
                />
              </div>
            </section>

            {/* Update status */}
            <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6">
              <h2 className="text-lg font-bold text-violet-700 mb-4">How are you feeling? 💜</h2>

              {!currentUser ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2 animate-bounce-soft">🐧</div>
                  <p className="font-medium">Select who you are first!</p>
                </div>
              ) : (
                <>
                  <StatusButtons
                    onStatusSelect={handleStatusUpdate}
                    onCustom={() => setShowCustomModal(true)}
                  />

                  <div className="mt-4">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note... 💭"
                      className="w-full border-2 border-violet-100 rounded-2xl px-4 py-3 text-gray-700 focus:outline-none focus:border-violet-300 bg-violet-50/50 placeholder:text-gray-300 font-medium transition-colors"
                    />
                  </div>

                  {loading && (
                    <div className="mt-3 text-center text-violet-400 text-sm font-semibold animate-shimmer">
                      Saving... 💜
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Right: today's timeline */}
          <div className="lg:col-span-1">
            <DailyTimeline entries={todayEntries} date={today} />
          </div>
        </div>
      </main>
    </div>
  )
}
