'use client'

import { motion } from 'framer-motion'
import { DEFAULT_STATUSES } from '@/lib/statusConfig'

type Props = {
  onStatusSelect: (status: string, emoji: string) => void
  onCustom: () => void
}

export default function StatusButtons({ onStatusSelect, onCustom }: Props) {
  const presets = DEFAULT_STATUSES.filter((s) => s.label !== 'Custom')

  return (
    <div className="grid grid-cols-3 gap-3">
      {presets.map((status) => (
        <motion.button
          key={status.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onStatusSelect(status.label, status.emoji)}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-white/80 ${status.bgColor}`}
        >
          <span className="text-2xl mb-1">{status.emoji}</span>
          <span className={`text-xs font-bold ${status.textColor}`}>{status.label}</span>
        </motion.button>
      ))}

      {/* Custom button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCustom}
        className="flex flex-col items-center justify-center p-4 rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-white/80 bg-rose-100"
      >
        <span className="text-2xl mb-1">✨</span>
        <span className="text-xs font-bold text-rose-700">+ Custom</span>
      </motion.button>
    </div>
  )
}
