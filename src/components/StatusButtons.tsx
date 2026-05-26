'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { PASTEL_COLORS } from '@/lib/statusConfig'

export type StatusFormData = {
  status: string
  emoji: string
  note: string
  color: string
  startTime: string
  endTime?: string
}

type Props = {
  onSubmit: (data: StatusFormData) => void
  loading: boolean
  userMascot: string
  userButtonClass: string
}

export default function StatusForm({ onSubmit, loading, userMascot, userButtonClass }: Props) {
  const [status, setStatus] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [note, setNote] = useState('')
  const [color, setColor] = useState<string>(PASTEL_COLORS[0].hex)
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [endTime, setEndTime] = useState('')

  const handleSubmit = () => {
    if (!status.trim()) return
    onSubmit({
      status: status.trim(),
      emoji: emoji.trim() || '✨',
      note: note.trim(),
      color,
      startTime,
      endTime: endTime || undefined,
    })
    setStatus('')
    setEmoji('✨')
    setNote('')
    setColor(PASTEL_COLORS[0].hex)
    setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    setEndTime('')
  }

  return (
    <div className="space-y-4">
      {/* Emoji + Status name */}
      <div className="flex gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className="w-16 text-center text-2xl border-2 border-violet-200 rounded-2xl p-2.5 focus:outline-none focus:border-violet-400 bg-violet-50"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Status</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={`What's ${userMascot} up to?`}
            className="w-full border-2 border-violet-200 rounded-2xl px-4 py-3 font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300"
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
          className="w-full border-2 border-violet-200 rounded-2xl px-4 py-3 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300 resize-none"
        />
      </div>

      {/* Time fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border-2 border-violet-200 rounded-2xl px-3 py-2.5 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">End Time (opt)</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border-2 border-violet-200 rounded-2xl px-3 py-2.5 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 text-sm"
          />
        </div>
      </div>

      {/* Pastel color picker */}
      <div>
        <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wide">Color</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PASTEL_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              title={c.name}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                color === c.hex
                  ? 'border-gray-500 scale-125 shadow-md'
                  : 'border-white/80 hover:scale-110 hover:shadow-sm'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        {/* Live preview */}
        <div
          className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 border border-white/60 shadow-sm transition-colors duration-200"
          style={{ backgroundColor: color }}
        >
          {emoji} {status || 'Your status preview...'}
        </div>
      </div>

      {/* Submit */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!status.trim() || loading}
        className={`w-full rounded-full px-6 py-3.5 font-bold text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${userButtonClass}`}
      >
        {loading ? 'Saving... 💜' : 'Set Status ✨'}
      </motion.button>
    </div>
  )
}
