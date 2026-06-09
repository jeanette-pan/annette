'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'

type Priority = 'high' | 'medium' | 'low'
type ItemType = 'bug' | 'suggestion'
type Status = 'open' | 'done'

type BugReport = {
  id: string
  type: ItemType
  title: string
  body: string | null
  priority: Priority
  status: Status
  createdAt: string
}

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low']

const priorityStyle: Record<Priority, { bg: string; text: string; border: string; label: string }> = {
  high:   { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: '🔴 High' },
  medium: { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: '🟡 Medium' },
  low:    { bg: '#f0fdf4', text: '#16a34a', border: '#86efac', label: '🟢 Low' },
}

function SubmitForm({ type, onCreated }: { type: ItemType; onCreated: (item: BugReport) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [loading, setLoading] = useState(false)

  const isBug = type === 'bug'

  const handleSubmit = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, body, priority }),
      })
      const data = await res.json()
      if (data.item) {
        onCreated(data.item)
        setTitle('')
        setBody('')
        setPriority('medium')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow p-4 space-y-3">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
        {isBug ? '🐛 Report a Bug' : '💡 Suggest a Feature'}
      </p>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
        placeholder={isBug ? 'What went wrong?' : 'What would you like?'}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300"
      />

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="More details... (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300 resize-none"
      />

      {/* Priority picker */}
      <div className="flex gap-1.5">
        {PRIORITY_ORDER.map(p => {
          const s = priorityStyle[p]
          const active = priority === p
          return (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150"
              style={{
                backgroundColor: active ? s.bg : 'rgba(249,250,251,0.8)',
                color: active ? s.text : '#9ca3af',
                border: `1.5px solid ${active ? s.border : 'transparent'}`,
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <motion.button
        whileHover={{ scale: title.trim() ? 1.02 : 1 }}
        whileTap={{ scale: title.trim() ? 0.98 : 1 }}
        onClick={handleSubmit}
        disabled={!title.trim() || loading}
        className="w-full py-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-40"
        style={{
          backgroundColor: isBug ? '#fce7f3' : '#ede9fe',
          color: isBug ? '#be185d' : '#6d28d9',
        }}
      >
        {loading ? 'Submitting...' : isBug ? '🐛 Submit Bug' : '💡 Submit Suggestion'}
      </motion.button>
    </div>
  )
}

function ItemCard({ item, onStatusToggle, onDelete }: {
  item: BugReport
  onStatusToggle: (id: string, status: Status) => void
  onDelete: (id: string) => void
}) {
  const p = priorityStyle[item.priority]
  const isDone = item.status === 'done'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border shadow-sm p-3.5 space-y-1.5"
      style={{ borderColor: isDone ? '#e5e7eb' : p.border, opacity: isDone ? 0.65 : 1 }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onStatusToggle(item.id, item.status)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150"
          style={{ borderColor: isDone ? '#86efac' : p.border, backgroundColor: isDone ? '#dcfce7' : 'white' }}
        >
          {isDone && <span className="text-[10px] text-green-600 font-bold">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold text-gray-700 leading-snug ${isDone ? 'line-through text-gray-400' : ''}`}>
            {item.title}
          </p>
          {item.body && (
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.body}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: p.bg, color: p.text }}
            >
              {p.label}
            </span>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors text-xs"
          >
            ×
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function Section({ title, items, onStatusToggle, onDelete }: {
  title: string
  items: BugReport[]
  onStatusToggle: (id: string, status: Status) => void
  onDelete: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{title}</p>
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <ItemCard key={item.id} item={item} onStatusToggle={onStatusToggle} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function BugsPage() {
  const [items, setItems] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bugs')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = useCallback((item: BugReport) => {
    setItems(prev => [...prev, item])
  }, [])

  const handleStatusToggle = useCallback(async (id: string, current: Status) => {
    const next: Status = current === 'open' ? 'done' : 'open'
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    await fetch(`/api/bugs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/bugs/${id}`, { method: 'DELETE' })
  }, [])

  const sortByPriority = (list: BugReport[]) =>
    [...list].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))

  const openBugs        = sortByPriority(items.filter(i => i.type === 'bug'        && i.status === 'open'))
  const openSuggestions = sortByPriority(items.filter(i => i.type === 'suggestion' && i.status === 'open'))
  const done            = items.filter(i => i.status === 'done').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-yellow-50 to-green-50">
      <AnimatedBackground />
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-violet-700 mb-6">Bugs & Suggestions 🐛</h1>

        <div className="flex gap-6 items-start">

          {/* Left sidebar — submit forms */}
          <div className="w-72 shrink-0 space-y-4 sticky top-20">
            <SubmitForm type="bug" onCreated={handleCreated} />
            <SubmitForm type="suggestion" onCreated={handleCreated} />
          </div>

          {/* Main panel */}
          <div className="flex-1 min-w-0 space-y-6">
            {loading ? (
              <p className="text-sm text-gray-300 text-center pt-10">Loading...</p>
            ) : (
              <>
                <Section
                  title="🐛 Active Bugs"
                  items={openBugs}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDelete}
                />
                <Section
                  title="💡 Suggestions"
                  items={openSuggestions}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDelete}
                />
                {done.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">✅ Fixed / Implemented</p>
                    <AnimatePresence mode="popLayout">
                      {done.map(item => (
                        <ItemCard key={item.id} item={item} onStatusToggle={handleStatusToggle} onDelete={handleDelete} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                {openBugs.length === 0 && openSuggestions.length === 0 && done.length === 0 && (
                  <p className="text-sm text-gray-300 text-center pt-16">
                    All clear! Submit a bug or suggestion on the left. 🎉
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
