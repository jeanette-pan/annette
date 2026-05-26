'use client'

import { motion } from 'framer-motion'
import { getUserConfig } from '@/lib/statusConfig'
import { formatTime } from '@/lib/utils'

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
}

export default function CurrentStatusCard({ userId, userName, entry, isMe }: Props) {
  const userConfig = getUserConfig(userId)
  const cardColor = entry?.color ?? userConfig.themeHex

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
        <span
          className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm text-white"
          style={{ backgroundColor: userConfig.accentHex }}
        >
          you
        </span>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        {/* User label with mascot */}
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{userConfig.mascot}</span>
          <p className="text-sm font-bold text-gray-600">{userName}</p>
        </div>

        {/* Status emoji — floats gently */}
        <div className="text-5xl animate-float my-2">
          {entry?.emoji ?? userConfig.mascot}
        </div>

        <p className="text-xl font-extrabold text-gray-700">
          {entry?.status ?? 'No status yet'}
        </p>

        {entry && (
          <p className="text-xs text-gray-500 font-medium">
            Since {formatTime(entry.startTime)}
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

        <p className="text-xs text-gray-500 mt-2">
          {entry
            ? `Thinking of you ${userConfig.mascot}`
            : userConfig.messages[0]}
        </p>
      </div>
    </motion.div>
  )
}
