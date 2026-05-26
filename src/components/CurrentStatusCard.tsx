'use client'

import { motion } from 'framer-motion'
import { getStatusConfig } from '@/lib/statusConfig'
import { formatTime } from '@/lib/utils'

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

type Props = {
  userId: string
  userName: string
  entry: StatusEntry | null
  isMe: boolean
}

export default function CurrentStatusCard({ userId, userName, entry, isMe }: Props) {
  const config = entry ? getStatusConfig(entry.status) : null

  const cardBg = config?.bgColor ?? 'bg-gray-100'
  const displayEmoji = entry?.emoji ?? '❓'
  const statusLabel = entry?.status ?? 'Unknown'
  const mascotMessage = config?.message ?? 'Thinking of you 💜'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`${cardBg} rounded-3xl shadow-lg border border-white/60 p-6 relative overflow-hidden`}
    >
      {isMe && (
        <span className="absolute top-3 right-3 bg-violet-400 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
          you
        </span>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{userName}</p>

        <div className="text-5xl animate-float my-2">
          {displayEmoji}
        </div>

        <p className="text-xl font-extrabold text-gray-700">{statusLabel}</p>

        {entry && (
          <p className="text-xs text-gray-500 font-medium">
            Since {formatTime(entry.startTime)}
          </p>
        )}

        {entry?.note && (
          <p className="text-sm text-gray-600 italic bg-white/50 rounded-xl px-3 py-1.5 mt-1">
            &ldquo;{entry.note}&rdquo;
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2">{mascotMessage}</p>
      </div>
    </motion.div>
  )
}
