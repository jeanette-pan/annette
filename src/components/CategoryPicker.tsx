'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { CATEGORIES, getCategory, type CategoryId } from '@/lib/categoryConfig'
import { QUICK_STATUSES } from '@/lib/quickStatuses'
import { getPartnerName } from '@/lib/statusConfig'
import type { StatusFormData } from './StatusButtons'

type Props = {
  userId: string
  userMascot: string
  onSubmit: (data: StatusFormData) => void
  loading?: boolean
}

export default function CategoryPicker({ userId, userMascot, onSubmit, loading }: Props) {
  const [catId, setCatId] = useState<CategoryId | null>(null)
  const [selectedQuick, setSelectedQuick] = useState<{ label: string; emoji: string } | null>(null)
  const [customText, setCustomText] = useState('')
  const [note, setNote] = useState('')
  const [isShared, setIsShared] = useState(false)

  const partnerName = getPartnerName(userId)
  const cat = catId ? getCategory(catId) : null
  const quickList = catId ? QUICK_STATUSES[catId] : []
  const statusText = selectedQuick?.label ?? customText.trim()
  const statusEmoji = selectedQuick?.emoji ?? cat?.emoji ?? '✨'

  const pickCategory = useCallback((id: CategoryId) => {
    if (id === catId) {
      setCatId(null)
      setSelectedQuick(null)
      setCustomText('')
      setNote('')
      setIsShared(false)
    } else {
      setCatId(id)
      setSelectedQuick(null)
      setCustomText('')
    }
  }, [catId])

  const pickQuick = useCallback((qs: { label: string; emoji: string }) => {
    setSelectedQuick(prev => prev?.label === qs.label ? null : qs)
    setCustomText('')
  }, [])

  const handleSubmit = useCallback(() => {
    if (!statusText || !cat) return
    onSubmit({
      status: statusText,
      emoji: statusEmoji,
      note,
      color: cat.color,
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      isShared,
      category: cat.id,
    })
    setCatId(null)
    setSelectedQuick(null)
    setCustomText('')
    setNote('')
    setIsShared(false)
  }, [statusText, statusEmoji, cat, note, isShared, onSubmit])

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg overflow-hidden">
      {/* Category grid */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
          {catId ? `${cat?.emoji} ${cat?.label}` : `${userMascot} What are you up to?`}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(c => {
            const active = c.id === catId
            return (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-150 select-none"
                style={{
                  backgroundColor: active ? c.color : 'rgba(249,250,251,0.8)',
                  outline: active ? `2.5px solid ${c.color}` : undefined,
                  outlineOffset: active ? '2px' : undefined,
                  transform: active ? 'scale(1.06)' : undefined,
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
                }}
              >
                <span className="text-lg leading-none">{c.emoji}</span>
                <span className="text-[9px] font-semibold text-gray-600 leading-none">{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded section: quick statuses, note, together toggle, save */}
      <AnimatePresence>
        {catId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5 border-t border-gray-100/70">
              {/* Quick status pills */}
              <div className="pt-3 flex flex-wrap gap-1.5">
                {quickList.map(qs => {
                  const active = selectedQuick?.label === qs.label
                  return (
                    <button
                      key={qs.label}
                      onClick={() => pickQuick(qs)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: active ? cat!.color : 'rgba(243,244,246,0.9)',
                        color: active ? '#374151' : '#9ca3af',
                        outline: active ? `2px solid ${cat!.color}` : undefined,
                        outlineOffset: active ? '2px' : undefined,
                        transform: active ? 'scale(1.05)' : undefined,
                      }}
                    >
                      <span>{qs.emoji}</span>
                      <span>{qs.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Custom text */}
              <input
                type="text"
                value={customText}
                onChange={e => { setCustomText(e.target.value); if (e.target.value) setSelectedQuick(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={`Or type custom... (${cat?.emoji})`}
                className="w-full px-3 py-2 text-sm rounded-2xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300"
              />

              {/* Note */}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note... 💭"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-2xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300 resize-none"
              />

              {/* Together toggle */}
              <button
                onClick={() => setIsShared(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl border-2 transition-all duration-200"
                style={{
                  backgroundColor: isShared ? '#f0fdf4' : '#f9fafb',
                  borderColor: isShared ? '#86efac' : '#e5e7eb',
                  boxShadow: isShared ? '0 0 12px rgba(134,239,172,0.4)' : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{isShared ? '💚' : '🤍'}</span>
                  <span className={`font-semibold text-xs ${isShared ? 'text-green-700' : 'text-gray-400'}`}>
                    {isShared ? `Together with ${partnerName}! 🐧🦕` : `Together with ${partnerName}?`}
                  </span>
                </div>
                <div
                  className="w-8 h-4 rounded-full flex items-center transition-all duration-200"
                  style={{ backgroundColor: isShared ? '#4ade80' : '#d1d5db' }}
                >
                  <div
                    className="w-3 h-3 bg-white rounded-full shadow transition-all duration-200"
                    style={{ marginLeft: isShared ? '18px' : '2px' }}
                  />
                </div>
              </button>

              {/* Save button */}
              <motion.button
                whileHover={{ scale: statusText ? 1.02 : 1 }}
                whileTap={{ scale: statusText ? 0.98 : 1 }}
                onClick={handleSubmit}
                disabled={!statusText || loading}
                className="w-full rounded-2xl py-3 font-bold text-sm transition-all duration-200 disabled:opacity-40 text-gray-800"
                style={{
                  backgroundColor: statusText ? (cat?.color ?? '#ede9fe') : '#f3f4f6',
                  boxShadow: statusText ? `0 2px 12px ${cat?.color ?? '#ede9fe'}80` : undefined,
                }}
              >
                {loading ? '✨ Saving...' : statusText ? `${statusEmoji} ${statusText}` : 'Pick a status above ↑'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
