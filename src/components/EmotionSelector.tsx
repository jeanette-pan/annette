'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { EMOTIONS, type EmotionId } from '@/lib/emotionConfig'

type Props = {
  userId: string
  currentEmotion: string | null
  onChange: (emotionId: EmotionId | null) => void
}

export default function EmotionSelector({ userId, currentEmotion, onChange }: Props) {
  const [pending, setPending] = useState<string | null>(null)

  const select = useCallback(async (id: EmotionId) => {
    if (pending) return
    const isDeselect = id === currentEmotion
    setPending(id)
    try {
      await fetch('/api/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emotion: isDeselect ? '' : id }),
      })
      onChange(isDeselect ? null : id)
    } catch { /* silent */ } finally {
      setPending(null)
    }
  }, [userId, currentEmotion, pending, onChange])

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm px-4 py-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
        How are you feeling?
      </p>
      <div className="flex items-end justify-between gap-1">
        {EMOTIONS.map(em => {
          const isActive   = currentEmotion === em.id
          const isSpinning = pending === em.id
          return (
            <button
              key={em.id}
              onClick={() => select(em.id)}
              title={isActive ? `${em.label} (tap to clear)` : em.label}
              disabled={!!pending}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <motion.div
                className="w-9 h-9 rounded-full"
                animate={{
                  scale: isSpinning ? 0.85 : isActive ? [1.18, 1.24, 1.18] : 1,
                  opacity: pending && !isActive && !isSpinning ? 0.4 : 1,
                }}
                transition={
                  isActive
                    ? { scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.15 } }
                    : { duration: 0.18, ease: 'easeOut' }
                }
                style={{
                  background: `linear-gradient(135deg, ${em.gradientFrom}, ${em.gradientTo})`,
                  boxShadow: isActive
                    ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 4.5px ${em.circleColor}, 0 0 20px ${em.glowColor}`
                    : undefined,
                }}
              />
              <span
                className="text-[8px] font-semibold leading-none text-center whitespace-nowrap"
                style={{ color: isActive ? em.circleColor : '#9ca3af' }}
              >
                {em.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
