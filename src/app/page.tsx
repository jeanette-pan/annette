'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'
import UserSelector, { useCurrentUser } from '@/components/UserSelector'
import CurrentStatusCard from '@/components/CurrentStatusCard'
import StatusForm, { type StatusFormData } from '@/components/StatusButtons'
import DailyTimeline from '@/components/DailyTimeline'
import { getTodayString } from '@/lib/utils'
import { getUserConfig } from '@/lib/statusConfig'

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
    // Poll every 5 seconds for live updates
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
          endTime: data.endTime,
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

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: status cards + form */}
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

            {/* Status update form */}
            <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6">
              {!currentUser ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2 animate-bounce-soft">🐧</div>
                  <p className="font-medium">Select who you are first!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-2xl">{userConfig?.mascot}</span>
                    <div>
                      <h2 className="text-lg font-bold text-violet-700">What are you up to?</h2>
                      <p className="text-xs text-gray-400">
                        Updating as <span className="font-semibold">{currentUser.userName}</span>
                      </p>
                    </div>
                  </div>
                  <StatusForm
                    onSubmit={handleStatusSubmit}
                    loading={loading}
                    userMascot={userConfig?.mascot ?? '🐧'}
                    userButtonClass={userConfig?.buttonClass ?? 'bg-violet-400 hover:bg-violet-500'}
                    userId={currentUser?.userId}
                  />
                </>
              )}
            </section>
          </div>

          {/* Right: shared live timeline */}
          <div className="lg:col-span-1">
            <DailyTimeline entries={todayEntries} date={today} />
          </div>
        </div>
      </main>
    </div>
  )
}
