'use client'

import { useState, useCallback } from 'react'
import { EMOTIONS, type EmotionId } from '@/lib/emotionConfig'

type Props = {
  userId: string
  currentEmotion: string | null
  onChange: (emotionId: EmotionId) => void
}

export default function EmotionSelector({ userId, currentEmotion, onChange }: Props) {
  const [pending, setPending] = useState<string | null>(null)

  const select = useCallback(async (id: EmotionId) => {
    if (pending || id === currentEmotion) return
    setPending(id)
    try {
      await fetch('/api/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emotion: id }),
      })
      onChange(id)
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
              title={em.label}
              disabled={!!pending}
              className="flex flex-col items-center gap-1.5 flex-1 group"
            >
              <div
                className="w-9 h-9 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: em.circleColor,
                  transform: isSpinning ? 'scale(0.9)' : isActive ? 'scale(1.18)' : 'scale(1)',
                  boxShadow: isActive
                    ? `0 0 0 3px rgba(255,255,255,0.85), 0 0 16px ${em.glowColor}`
                    : undefined,
                  opacity: pending && !isActive && !isSpinning ? 0.4 : 1,
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
