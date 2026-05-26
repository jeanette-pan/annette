'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (status: string, emoji: string, note: string) => void
}

export default function CustomStatusModal({ isOpen, onClose, onSubmit }: Props) {
  const [statusName, setStatusName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!statusName.trim()) return
    onSubmit(statusName.trim(), emoji || '✨', note.trim())
    setStatusName('')
    setEmoji('✨')
    setNote('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8 max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-violet-700">What are you up to? ✨</h2>
                <p className="text-sm text-gray-400 mt-0.5">Create your own status</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={4}
                    className="w-16 text-center text-2xl border-2 border-violet-200 rounded-xl p-2 focus:outline-none focus:border-violet-400 bg-violet-50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                    Status Name
                  </label>
                  <input
                    type="text"
                    value={statusName}
                    onChange={(e) => setStatusName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="e.g. Cooking..."
                    className="w-full border-2 border-violet-200 rounded-xl px-4 py-2.5 font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a little note... 💭"
                  className="w-full border-2 border-violet-200 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50 placeholder:text-gray-300"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!statusName.trim()}
                className="w-full bg-violet-400 text-white rounded-full px-6 py-3 font-semibold hover:bg-violet-500 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Set Status ✨
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
