'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { CATEGORIES, getCategory, type CategoryId } from '@/lib/categoryConfig'
import { getPartnerName } from '@/lib/statusConfig'
import type { StatusFormData } from './StatusButtons'

type SharedQS = { id: string; label: string; emoji: string; sortOrder: number }

type InitialData = {
  id: string
  status: string
  emoji: string
  color: string
  note?: string | null
  startTime: string
  endTime?: string
  isShared: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StatusFormData) => void
  initialData?: InitialData
  loading?: boolean
  userId?: string
}

export default function StatusEditorModal({ isOpen, onClose, onSubmit, initialData, loading = false, userId }: Props) {
  const [catId, setCatId] = useState<CategoryId | null>(null)
  const [selectedQuick, setSelectedQuick] = useState<SharedQS | null>(null)
  const [customText, setCustomText] = useState('')
  const [note, setNote] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isShared, setIsShared] = useState(false)

  const [quickItems, setQuickItems] = useState<SharedQS[]>([])
  const [qsLoading, setQsLoading] = useState(false)

  const [manageMode, setManageMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ label: string; emoji: string }>({ label: '', emoji: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [newDraft, setNewDraft] = useState<{ label: string; emoji: string }>({ label: '', emoji: '✨' })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const editInputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const needsInitialMatch = useRef(false)
  const pendingStatus = useRef('')

  const partnerName = userId ? getPartnerName(userId) : 'your partner'
  const cat = catId ? getCategory(catId) : null

  // Initialize form when a new entry is opened for editing
  useEffect(() => {
    if (!isOpen) return
    needsInitialMatch.current = false
    if (!initialData) return
    const detectedCat = CATEGORIES.find(c => c.color === initialData.color)
    setCatId(detectedCat?.id ?? null)
    setStartTime(initialData.startTime)
    setEndTime(initialData.endTime ?? '')
    setNote(initialData.note ?? '')
    setIsShared(initialData.isShared)
    setSelectedQuick(null)
    setCustomText(initialData.status)
    pendingStatus.current = initialData.status
    needsInitialMatch.current = true
    setManageMode(false)
    setEditingId(null)
    setAddingNew(false)
  }, [isOpen, initialData?.id])

  // Fetch quick items when category changes
  useEffect(() => {
    if (!catId) { setQuickItems([]); return }
    setQsLoading(true)
    setQuickItems([])
    fetch(`/api/quick-statuses?category=${catId}`)
      .then(r => r.json())
      .then(d => setQuickItems(d.items ?? []))
      .catch(() => setQuickItems([]))
      .finally(() => setQsLoading(false))
  }, [catId])

  // Auto-select matching quick status once after items first load
  useEffect(() => {
    if (!needsInitialMatch.current || !quickItems.length) return
    const match = quickItems.find(qs => qs.label === pendingStatus.current)
    if (match) {
      setSelectedQuick(match)
      setCustomText('')
    }
    needsInitialMatch.current = false
  }, [quickItems])

  const refetchQS = useCallback(async () => {
    if (!catId) return
    const d = await fetch(`/api/quick-statuses?category=${catId}`).then(r => r.json())
    setQuickItems(d.items ?? [])
  }, [catId])

  // ── QS mutations ───────────────────────────────────────────────────────────

  const deleteQS = useCallback(async (id: string) => {
    setQuickItems(prev => prev.filter(q => q.id !== id))
    if (selectedQuick?.id === id) setSelectedQuick(null)
    await fetch(`/api/quick-statuses/${id}`, { method: 'DELETE' }).catch(() => refetchQS())
  }, [selectedQuick, refetchQS])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editDraft.label.trim()) { setEditingId(null); return }
    const label = editDraft.label.trim()
    const emoji = editDraft.emoji || '✨'
    setQuickItems(prev => prev.map(q => q.id === editingId ? { ...q, label, emoji } : q))
    if (selectedQuick?.id === editingId) setSelectedQuick(prev => prev ? { ...prev, label, emoji } : null)
    setEditingId(null)
    await fetch(`/api/quick-statuses/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, emoji }),
    }).catch(() => refetchQS())
  }, [editingId, editDraft, selectedQuick, refetchQS])

  const moveQS = useCallback(async (id: string, dir: -1 | 1) => {
    const list = [...quickItems]
    const i = list.findIndex(q => q.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    setQuickItems(list)
    await fetch('/api/quick-statuses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: list.map(q => q.id) }),
    }).catch(() => refetchQS())
  }, [quickItems, refetchQS])

  const addNew = useCallback(async () => {
    if (!catId || !newDraft.label.trim()) { setAddingNew(false); return }
    const label = newDraft.label.trim()
    const emoji = newDraft.emoji || '✨'
    setNewDraft({ label: '', emoji: '✨' })
    setAddingNew(false)
    try {
      const d = await fetch('/api/quick-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: catId, label, emoji }),
      }).then(r => r.json())
      if (d.item) setQuickItems(prev => [...prev, d.item])
    } catch { await refetchQS() }
  }, [catId, newDraft, refetchQS])

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const onDragStart = useCallback((id: string) => setDraggingId(id), [])

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== draggingId) setDragOverId(id)
  }, [draggingId])

  const onDrop = useCallback(async (targetId: string) => {
    if (!catId || !draggingId || draggingId === targetId) {
      setDraggingId(null); setDragOverId(null); return
    }
    const list = [...quickItems]
    const fromIdx = list.findIndex(q => q.id === draggingId)
    const toIdx = list.findIndex(q => q.id === targetId)
    if (fromIdx >= 0 && toIdx >= 0) {
      const [item] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, item)
      setQuickItems(list)
      await fetch('/api/quick-statuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: list.map(q => q.id) }),
      }).catch(() => refetchQS())
    }
    setDraggingId(null); setDragOverId(null)
  }, [catId, draggingId, quickItems, refetchQS])

  // ── Navigation ─────────────────────────────────────────────────────────────

  const pickCategory = useCallback((id: CategoryId) => {
    if (id === catId) {
      setCatId(null); setSelectedQuick(null); setManageMode(false)
    } else {
      setCatId(id); setSelectedQuick(null)
      setManageMode(false); setAddingNew(false); setEditingId(null)
    }
  }, [catId])

  const handleSubmit = useCallback(() => {
    const status = selectedQuick?.label ?? customText.trim()
    if (!status || !startTime) return
    const emoji = selectedQuick?.emoji ?? cat?.emoji ?? '✨'
    const color = cat?.color ?? initialData?.color ?? '#e9d5ff'
    onSubmit({
      status, emoji, note, color,
      startTime,
      endTime: endTime || undefined,
      isShared,
      category: catId ?? undefined,
    })
  }, [selectedQuick, customText, startTime, endTime, cat, initialData?.color, note, isShared, catId, onSubmit])

  const statusText = selectedQuick?.label ?? customText.trim()
  const statusEmoji = selectedQuick?.emoji ?? cat?.emoji ?? '✨'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[520px] max-h-[85vh] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-violet-700">Edit Status ✏️</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 space-y-4">

                {/* Category grid */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Category</p>
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

                {/* Quick statuses + manage mode */}
                {catId && (
                  manageMode ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Manage {cat?.label}</p>
                        <button
                          onClick={() => { setManageMode(false); setEditingId(null); setAddingNew(false) }}
                          className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 px-2 py-0.5 rounded-full hover:bg-violet-50 transition-colors"
                        >
                          Done ✓
                        </button>
                      </div>

                      {quickItems.map((qs, i) =>
                        editingId === qs.id ? (
                          <div key={qs.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border-2 border-violet-300 bg-white shadow-sm">
                            <input
                              value={editDraft.emoji}
                              onChange={e => setEditDraft(d => ({ ...d, emoji: e.target.value }))}
                              className="w-7 text-sm text-center outline-none shrink-0"
                              maxLength={4}
                            />
                            <input
                              ref={editInputRef}
                              value={editDraft.label}
                              onChange={e => setEditDraft(d => ({ ...d, label: e.target.value }))}
                              onBlur={saveEdit}
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                              className="flex-1 text-xs font-semibold outline-none text-gray-700 min-w-0"
                              placeholder="Label"
                            />
                            <button onClick={saveEdit} className="text-[10px] text-violet-500 font-bold px-2 py-0.5 rounded-full hover:bg-violet-50 shrink-0">Save</button>
                          </div>
                        ) : (
                          <div
                            key={qs.id}
                            draggable
                            onDragStart={() => onDragStart(qs.id)}
                            onDragOver={e => onDragOver(e, qs.id)}
                            onDrop={() => onDrop(qs.id)}
                            onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all duration-100 select-none"
                            style={{
                              backgroundColor: dragOverId === qs.id ? cat!.color + '40' : 'rgba(249,250,251,0.9)',
                              borderColor: dragOverId === qs.id ? cat!.color : 'transparent',
                              opacity: draggingId === qs.id ? 0.4 : 1,
                              cursor: draggingId ? 'grabbing' : 'grab',
                            }}
                          >
                            <span className="text-gray-300 text-[11px] leading-none shrink-0 font-bold tracking-tighter">⠿⠿</span>
                            <span className="text-sm shrink-0">{qs.emoji}</span>
                            <span className="flex-1 text-xs font-semibold text-gray-700 min-w-0 truncate">{qs.label}</span>
                            <button onClick={() => moveQS(qs.id, -1)} disabled={i === 0} className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 disabled:opacity-20 text-[10px] shrink-0">↑</button>
                            <button onClick={() => moveQS(qs.id, 1)} disabled={i === quickItems.length - 1} className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 disabled:opacity-20 text-[10px] shrink-0">↓</button>
                            <button
                              onClick={() => { setEditingId(qs.id); setEditDraft({ label: qs.label, emoji: qs.emoji }); setTimeout(() => editInputRef.current?.focus(), 50) }}
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-violet-100 text-violet-400 text-[10px] shrink-0 transition-colors"
                            >✏</button>
                            <button onClick={() => deleteQS(qs.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-red-400 text-[11px] shrink-0 transition-colors">×</button>
                          </div>
                        )
                      )}

                      {addingNew ? (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border-2 border-violet-300 bg-white shadow-sm">
                          <input
                            value={newDraft.emoji}
                            onChange={e => setNewDraft(d => ({ ...d, emoji: e.target.value }))}
                            className="w-7 text-sm text-center outline-none shrink-0"
                            maxLength={4}
                            placeholder="✨"
                          />
                          <input
                            ref={newInputRef}
                            value={newDraft.label}
                            onChange={e => setNewDraft(d => ({ ...d, label: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') addNew(); if (e.key === 'Escape') setAddingNew(false) }}
                            className="flex-1 text-xs font-semibold outline-none text-gray-700 min-w-0"
                            placeholder="Status name..."
                            autoFocus
                          />
                          <button onClick={addNew} className="text-[10px] text-violet-500 font-bold px-2 py-0.5 rounded-full hover:bg-violet-50 shrink-0">Add</button>
                          <button onClick={() => setAddingNew(false)} className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full hover:bg-gray-100 shrink-0">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingNew(true); setTimeout(() => newInputRef.current?.focus(), 50) }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-violet-300 hover:text-violet-400 transition-colors text-[11px] font-semibold"
                        >
                          <span>+</span><span>Add new status</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Quick Status</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {qsLoading ? (
                          <span className="text-xs text-gray-300">Loading...</span>
                        ) : quickItems.map(qs => {
                          const isActive = selectedQuick?.id === qs.id
                          return (
                            <button
                              key={qs.id}
                              onClick={() => { setSelectedQuick(prev => prev?.id === qs.id ? null : qs); setCustomText('') }}
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
                          )
                        })}
                        <button
                          onClick={() => { setManageMode(true); setSelectedQuick(null) }}
                          className="px-2 py-1 rounded-full text-[10px] font-bold text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Manage quick statuses"
                        >
                          ✎
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* Status text */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <input
                    type="text"
                    value={customText}
                    onChange={e => { setCustomText(e.target.value); if (e.target.value) setSelectedQuick(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={catId ? 'Or type custom...' : 'Type a status...'}
                    className="w-full px-3 py-2 text-sm rounded-2xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300"
                  />
                </div>

                {/* Note */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Note</p>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note... 💭"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-2xl border border-gray-200 bg-white/80 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-violet-300 resize-none"
                  />
                </div>

                {/* Time pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Start Time</p>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-2xl border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:border-violet-300"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">End Time</p>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-2xl border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:border-violet-300"
                    />
                  </div>
                </div>

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

                {/* Save */}
                <motion.button
                  whileHover={{ scale: statusText ? 1.02 : 1 }}
                  whileTap={{ scale: statusText ? 0.98 : 1 }}
                  onClick={handleSubmit}
                  disabled={!statusText || !startTime || loading}
                  className="w-full rounded-2xl py-3 font-bold text-sm transition-all duration-200 disabled:opacity-40 text-gray-800"
                  style={{
                    backgroundColor: statusText ? (cat?.color ?? '#ede9fe') : '#f3f4f6',
                    boxShadow: statusText ? `0 2px 12px ${cat?.color ?? '#ede9fe'}80` : undefined,
                  }}
                >
                  {loading ? '✨ Saving...' : statusText ? `${statusEmoji} Save: ${statusText}` : 'Pick or type a status above ↑'}
                </motion.button>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
