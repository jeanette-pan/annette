'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { PASTEL_COLORS, getPartnerName } from '@/lib/statusConfig'
import { type StatusFormData } from './StatusButtons'
import Link from 'next/link'

type StatusTemplate = {
  id: string
  userId: string
  name: string
  status: string
  emoji: string
  color: string
  note?: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StatusFormData) => void
  userId?: string
  userName?: string
  userMascot?: string
  userButtonClass?: string
  initialData?: Partial<StatusFormData & { id?: string }>
  mode?: 'create' | 'edit'
  loading?: boolean
}

export default function AddStatusModal({
  isOpen,
  onClose,
  onSubmit,
  userId,
  userName,
  userMascot = '🐧',
  userButtonClass = 'bg-violet-400 hover:bg-violet-500',
  initialData,
  mode = 'create',
  loading = false,
}: Props) {
  const [status, setStatus] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [note, setNote] = useState('')
  const [color, setColor] = useState<string>(PASTEL_COLORS[0].hex)
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [endTime, setEndTime] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [templates, setTemplates] = useState<StatusTemplate[]>([])

  const partnerName = userId ? getPartnerName(userId) : 'partner'

  // Populate from initialData when editing
  useEffect(() => {
    if (initialData) {
      setStatus(initialData.status ?? '')
      setEmoji(initialData.emoji ?? '✨')
      setNote(initialData.note ?? '')
      setColor(initialData.color ?? PASTEL_COLORS[0].hex)
      setStartTime(initialData.startTime ?? format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEndTime(initialData.endTime ?? '')
      setIsShared(initialData.isShared ?? false)
    } else {
      setStatus('')
      setEmoji('✨')
      setNote('')
      setColor(PASTEL_COLORS[0].hex)
      setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEndTime('')
      setIsShared(false)
    }
  }, [initialData, isOpen])

  const fetchTemplates = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/templates?userId=${userId}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch { /* silent */ }
  }, [userId])

  useEffect(() => {
    if (isOpen) fetchTemplates()
  }, [isOpen, fetchTemplates])

  const applyTemplate = (tpl: StatusTemplate) => {
    setStatus(tpl.status)
    setEmoji(tpl.emoji)
    setColor(tpl.color)
    setNote(tpl.note ?? '')
  }

  const handleSubmit = () => {
    if (!status.trim()) return
    onSubmit({
      status: status.trim(),
      emoji: emoji.trim() || '✨',
      note: note.trim(),
      color,
      startTime,
      endTime: endTime || undefined,
      isShared,
    })
    if (mode === 'create') {
      setStatus('')
      setEmoji('✨')
      setNote('')
      setColor(PASTEL_COLORS[0].hex)
      setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
      setEndTime('')
      setIsShared(false)
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/25 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 w-full max-w-lg max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md rounded-t-3xl px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-extrabold text-violet-700">
                  {mode === 'edit' ? 'Edit Status ✏️' : `${userMascot} What are you up to?`}
                </h2>
                {mode === 'create' && userName && (
                  <p className="text-xs text-gray-400 mt-0.5">Updating as <span className="font-semibold">{userName}</span></p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Templates */}
              {templates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quick Templates</p>
                    <Link href="/templates" className="text-xs text-violet-500 font-semibold hover:text-violet-700" onClick={onClose}>
                      Manage 📋
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {templates.slice(0, 8).map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 border border-white/60 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-150"
                        style={{ backgroundColor: tpl.color }}
                      >
                        <span>{tpl.emoji}</span>
                        <span className="max-w-[80px] truncate">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {templates.length === 0 && userId && (
                <Link
                  href="/templates"
                  className="block text-xs text-violet-400 hover:text-violet-600 text-center transition-colors"
                  onClick={onClose}
                >
                  + Create templates for quick status updates 📋
                </Link>
              )}

              {/* Emoji + Status */}
              <div className="flex gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Emoji</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={4}
                    className="w-14 text-center text-2xl border-2 border-violet-200 rounded-2xl p-2 focus:outline-none focus:border-violet-400 bg-violet-50"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Status</label>
                  <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder={`What's ${userMascot} up to?`}
                    autoFocus
                    className="w-full border-2 border-violet-200 rounded-2xl px-4 py-2.5 font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add details... 💭"
                  rows={2}
                  className="w-full border-2 border-violet-200 rounded-2xl px-4 py-2.5 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300 resize-none"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border-2 border-violet-200 rounded-2xl px-3 py-2 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">End Time (opt)</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border-2 border-violet-200 rounded-2xl px-3 py-2 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 text-sm"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wide">Color</label>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {PASTEL_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                        color === c.hex ? 'border-gray-500 scale-125 shadow-md' : 'border-white/80 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                {/* Preview */}
                <div
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-gray-600 border border-white/60 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {emoji} {status || 'Preview...'}
                </div>
              </div>

              {/* Shared toggle */}
              <button
                onClick={() => setIsShared(!isShared)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-200 ${
                  isShared
                    ? 'bg-green-50 border-green-300 shadow-[0_0_12px_rgba(134,239,172,0.5)]'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{isShared ? '💚' : '🤍'}</span>
                  <span className={`font-semibold text-sm ${isShared ? 'text-green-700' : 'text-gray-500'}`}>
                    {isShared ? `Together time with ${partnerName}! 🐧🦕` : `Shared activity with ${partnerName}`}
                  </span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all duration-200 flex items-center ${isShared ? 'bg-green-400' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${isShared ? 'ml-5' : 'ml-0.5'}`} />
                </div>
              </button>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!status.trim() || loading}
                className={`w-full rounded-full px-6 py-3.5 font-bold text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${userButtonClass}`}
              >
                {loading ? 'Saving... 💜' : mode === 'edit' ? 'Save Changes ✨' : 'Set Status ✨'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
