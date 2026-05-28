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
          const isActive  = currentEmotion === em.id
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
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-base transition-transform duration-200"
                style={{
                  backgroundColor: em.selectorBg,
                  transform: isSpinning ? 'scale(0.9)' : isActive ? 'scale(1.18)' : 'scale(1)',
                  boxShadow: isActive
                    ? `0 0 0 2.5px white, 0 0 0 4px ${em.orbColor}, 0 0 16px ${em.glowColor}`
                    : undefined,
                  opacity: pending && !isActive && !isSpinning ? 0.45 : 1,
                }}
              >
                {em.emoji}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ backgroundColor: em.orbColor }}
                  />
                )}
              </div>
              <span
                className="text-[8px] font-semibold leading-none text-center whitespace-nowrap"
                style={{ color: isActive ? em.orbColor : '#9ca3af' }}
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
