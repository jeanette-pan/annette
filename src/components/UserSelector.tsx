'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type CurrentUser = {
  userId: string
  userName: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('annette_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('annette_user')
      }
    }
  }, [])

  return user
}

export default function UserSelector() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('annette_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('annette_user')
      }
    }
  }, [])

  const selectUser = (userId: string, userName: string) => {
    const userData: CurrentUser = { userId, userName }
    localStorage.setItem('annette_user', JSON.stringify(userData))
    setUser(userData)
  }

  if (!mounted) return null
  if (user) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-10 mx-4 text-center max-w-sm w-full"
        >
          <div className="text-5xl mb-2 animate-bounce-soft">💜</div>
          <h1 className="text-2xl font-extrabold text-violet-700 mb-2">Who are you?</h1>
          <p className="text-gray-500 text-sm mb-8">Pick your character to get started!</p>

          <div className="flex flex-col gap-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => selectUser('jeanette', 'Jeanette')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-violet-100 border-2 border-violet-200 hover:border-violet-400 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-4xl mb-2">🐧</span>
              <span className="font-bold text-violet-700 text-lg">I&apos;m Jeanette</span>
              <span className="text-violet-400 text-sm mt-1">the cozy penguin</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => selectUser('partner', 'Partner')}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-green-100 border-2 border-green-200 hover:border-green-400 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-4xl mb-2">🦕</span>
              <span className="font-bold text-green-700 text-lg">I&apos;m Partner</span>
              <span className="text-green-400 text-sm mt-1">the friendly dino</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
