'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getUserConfig } from '@/lib/statusConfig'
import { formatTime, formatDurationFromDates, isSleepStatus } from '@/lib/utils'
import { getEmotion } from '@/lib/emotionConfig'

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

type Props = {
  userId: string
  userName: string
  entry: StatusEntry | null
  isMe: boolean
  currentEmotionId?: string | null
  onEdit?: (entry: StatusEntry) => void
}

export default function CurrentStatusCard({ userId, userName, entry, isMe, currentEmotionId, onEdit }: Props) {
  const userConfig = getUserConfig(userId)
  const cardColor = entry?.color ?? userConfig.themeHex
  const [duration, setDuration] = useState<string>('')

  useEffect(() => {
    if (!entry) {
      setDuration('')
      return
    }
    const update = () => {
      setDuration(formatDurationFromDates(entry.startTime, entry.endTime ?? null))
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [entry])

  const isSleep = entry ? isSleepStatus(entry.status) : false

  return (
    <motion.div
      key={entry?.id ?? `empty-${userId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-3xl shadow-lg border border-white/60 p-6 relative overflow-hidden"
      style={{ backgroundColor: cardColor }}
    >
      {isMe && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {entry && onEdit && (
            <button
              onClick={() => onEdit(entry)}
              className="text-xs font-bold px-2 py-1 rounded-full shadow-sm text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: userConfig.accentHex }}
            >
              ✏️
            </button>
          )}
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm text-white"
            style={{ backgroundColor: userConfig.accentHex }}
          >
            you
          </span>
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        {/* User label with mascot */}
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{userConfig.mascot}</span>
          <p className="text-sm font-bold text-gray-600">{userName}</p>
        </div>

        {/* Status emoji — floats gently */}
        <div className="text-5xl animate-float my-2 relative">
          {entry?.emoji ?? userConfig.mascot}
          {isSleep && (
            <span className="absolute -top-1 -right-3 text-sm bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 font-semibold text-xs">
              😴
            </span>
          )}
        </div>

        <p className="text-xl font-extrabold text-gray-700">
          {entry?.status ?? 'No status yet'}
        </p>

        {entry && (
          <p className="text-xs text-gray-500 font-medium">
            Since {formatTime(entry.startTime)}
          </p>
        )}

        {/* Live duration timer */}
        {entry && !entry.endTime && duration && (
          <p className="text-xs font-semibold text-gray-500 bg-white/50 rounded-full px-3 py-1">
            for {duration}
          </p>
        )}

        {entry?.endTime && (
          <p className="text-xs text-gray-400 font-medium">
            Until {formatTime(entry.endTime)}
          </p>
        )}

        {entry?.note && (
          <p className="text-sm text-gray-600 italic bg-white/50 rounded-xl px-3 py-1.5 mt-1">
            &ldquo;{entry.note}&rdquo;
          </p>
        )}
      </div>

      {/* Current emotion orb — bottom-left, color only, no text */}
      {(() => {
        const em = getEmotion(currentEmotionId)
        if (!em) return null
        return (
          <div
            aria-hidden
            className="absolute bottom-3 right-3 w-3 h-3 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${em.gradientFrom}, ${em.gradientTo})`,
              boxShadow: `0 0 7px ${em.glowColor}`,
            }}
          />
        )
      })()}
    </motion.div>
  )
}
