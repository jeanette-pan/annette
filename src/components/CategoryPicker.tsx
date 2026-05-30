'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { CATEGORIES, getCategory, type CategoryId } from '@/lib/categoryConfig'
import { QUICK_STATUSES } from '@/lib/quickStatuses'
import { getPartnerName } from '@/lib/statusConfig'
import type { StatusFormData } from './StatusButtons'

type QSCustomizations = {
  hidden: string[]                                         // "categoryId:originalLabel"
  overrides: Record<string, { label: string; emoji: string }>  // same key → override values
}

type EffectiveQS = { label: string; emoji: string; originalLabel: string }

function loadCustomizations(userId: string): QSCustomizations {
  if (typeof window === 'undefined') return { hidden: [], overrides: {} }
  try {
    const raw = localStorage.getItem(`annette_qs_${userId}`)
    return raw ? JSON.parse(raw) : { hidden: [], overrides: {} }
  } catch { return { hidden: [], overrides: {} } }
}

function saveCustomizations(userId: string, state: QSCustomizations) {
  try { localStorage.setItem(`annette_qs_${userId}`, JSON.stringify(state)) } catch { /* noop */ }
}

type Props = {
  userId: string
  userMascot: string
  onSubmit: (data: StatusFormData) => void
  loading?: boolean
}

export default function CategoryPicker({ userId, userMascot, onSubmit, loading }: Props) {
  const [catId, setCatId] = useState<CategoryId | null>(null)
  const [selectedQuick, setSelectedQuick] = useState<EffectiveQS | null>(null)
  const [customText, setCustomText] = useState('')
  const [note, setNote] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [qsCustom, setQsCustom] = useState<QSCustomizations>({ hidden: [], overrides: {} })
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ label: '', emoji: '' })
  const editLabelRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQsCustom(loadCustomizations(userId)) }, [userId])

  const partnerName = getPartnerName(userId)
  const cat = catId ? getCategory(catId) : null

  const effectiveList = useMemo<EffectiveQS[]>(() => {
    if (!catId) return []
    return QUICK_STATUSES[catId]
      .map(qs => {
        const key = `${catId}:${qs.label}`
        const override = qsCustom.overrides[key]
        return override
          ? { label: override.label, emoji: override.emoji, originalLabel: qs.label }
          : { ...qs, originalLabel: qs.label }
      })
      .filter(qs => !qsCustom.hidden.includes(`${catId}:${qs.originalLabel}`))
  }, [catId, qsCustom])

  const updateQsCustom = useCallback((updater: (prev: QSCustomizations) => QSCustomizations) => {
    setQsCustom(prev => {
      const next = updater(prev)
      saveCustomizations(userId, next)
      return next
    })
  }, [userId])

  const deleteQS = useCallback((e: React.MouseEvent, originalLabel: string) => {
    e.stopPropagation()
    if (!catId) return
    const key = `${catId}:${originalLabel}`
    updateQsCustom(prev => ({ ...prev, hidden: [...prev.hidden.filter(h => h !== key), key] }))
    setSelectedQuick(prev => prev?.originalLabel === originalLabel ? null : prev)
  }, [catId, updateQsCustom])

  const startEdit = useCallback((e: React.MouseEvent, qs: EffectiveQS) => {
    e.stopPropagation()
    if (!catId) return
    setEditingKey(`${catId}:${qs.originalLabel}`)
    setEditDraft({ label: qs.label, emoji: qs.emoji })
    setTimeout(() => editLabelRef.current?.focus(), 50)
  }, [catId])

  const saveEdit = useCallback(() => {
    if (!editingKey || !editDraft.label.trim()) { setEditingKey(null); return }
    updateQsCustom(prev => ({
      ...prev,
      overrides: { ...prev.overrides, [editingKey]: { label: editDraft.label.trim(), emoji: editDraft.emoji || '✨' } },
    }))
    setSelectedQuick(prev => {
      if (!prev || `${catId}:${prev.originalLabel}` !== editingKey) return prev
      return { ...prev, label: editDraft.label.trim(), emoji: editDraft.emoji || '✨' }
    })
    setEditingKey(null)
  }, [editingKey, editDraft, updateQsCustom, catId])

  const statusText = selectedQuick?.label ?? customText.trim()
  const statusEmoji = selectedQuick?.emoji ?? cat?.emoji ?? '✨'

  const pickCategory = useCallback((id: CategoryId) => {
    if (id === catId) {
      setCatId(null); setSelectedQuick(null); setCustomText('')
      setNote(''); setIsShared(false); setEditingKey(null)
    } else {
      setCatId(id); setSelectedQuick(null); setCustomText(''); setEditingKey(null)
    }
  }, [catId])

  const pickQuick = useCallback((qs: EffectiveQS) => {
    setSelectedQuick(prev => prev?.originalLabel === qs.originalLabel ? null : qs)
    setCustomText('')
  }, [])

  const handleSubmit = useCallback(() => {
    if (!statusText || !cat) return
    onSubmit({
      status: statusText, emoji: statusEmoji, note,
      color: cat.color, startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      isShared, category: cat.id,
    })
    setCatId(null); setSelectedQuick(null); setCustomText(''); setNote(''); setIsShared(false)
  }, [statusText, statusEmoji, cat, note, isShared, onSubmit])

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg overflow-hidden">
      {/* Category grid — colored text buttons, no emojis */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
          {catId ? cat?.label : `${userMascot} What are you up to?`}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(c => {
            const active = c.id === catId
            return (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className="px-1 py-2 rounded-xl text-[10px] font-bold text-center transition-all duration-150 select-none leading-tight"
                style={{
                  backgroundColor: active ? c.color : 'rgba(249,250,251,0.8)',
                  color: active ? '#374151' : '#9ca3af',
                  outline: active ? `2.5px solid ${c.color}` : undefined,
                  outlineOffset: active ? '2px' : undefined,
                  transform: active ? 'scale(1.06)' : undefined,
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded section when category selected */}
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
              <div className="pt-3 flex flex-wrap gap-2">
                {effectiveList.map(qs => {
                  const isActive = selectedQuick?.originalLabel === qs.originalLabel
                  const isEditing = editingKey === `${catId}:${qs.originalLabel}`

                  if (isEditing) {
                    return (
                      <div key={qs.originalLabel} className="flex items-center gap-0.5 px-2 py-1 rounded-full border-2 border-violet-300 bg-white shadow-sm">
                        <input
                          value={editDraft.emoji}
                          onChange={e => setEditDraft(d => ({ ...d, emoji: e.target.value }))}
                          className="w-6 text-[11px] text-center outline-none"
                          maxLength={4}
                        />
                        <input
                          ref={editLabelRef}
                          value={editDraft.label}
                          onChange={e => setEditDraft(d => ({ ...d, label: e.target.value }))}
                          onBlur={saveEdit}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingKey(null) }}
                          className="text-[11px] font-semibold outline-none w-16 text-gray-700"
                          placeholder="Label"
                        />
                      </div>
                    )
                  }

                  return (
                    <div key={qs.originalLabel} className="relative group/pill">
                      <button
                        onClick={() => pickQuick(qs)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150"
                        style={{
                          backgroundColor: isActive ? cat!.color : 'rgba(243,244,246,0.9)',
                          color: isActive ? '#374151' : '#9ca3af',
                          outline: isActive ? `2px solid ${cat!.color}` : undefined,
                          outlineOffset: isActive ? '2px' : undefined,
                          transform: isActive ? 'scale(1.05)' : undefined,
                        }}
                      >
                        <span>{qs.emoji}</span>
                        <span>{qs.label}</span>
                      </button>
                      {/* Hover: edit + delete */}
                      <div className="absolute -top-2 -right-1 hidden group-hover/pill:flex gap-0.5 z-10">
                        <button
                          onClick={e => startEdit(e, qs)}
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-white shadow text-[8px] text-violet-400 hover:bg-violet-50 leading-none"
                          title="Edit"
                        >✏</button>
                        <button
                          onClick={e => deleteQS(e, qs.originalLabel)}
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-white shadow text-[9px] text-red-400 hover:bg-red-50 leading-none"
                          title="Remove"
                        >×</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Custom text */}
              <input
                type="text"
                value={customText}
                onChange={e => { setCustomText(e.target.value); if (e.target.value) setSelectedQuick(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Or type custom..."
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
                  <div className="w-3 h-3 bg-white rounded-full shadow transition-all duration-200" style={{ marginLeft: isShared ? '18px' : '2px' }} />
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
