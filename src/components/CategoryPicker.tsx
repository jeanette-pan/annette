'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { CATEGORIES, getCategory, type CategoryId } from '@/lib/categoryConfig'
import { QUICK_STATUSES } from '@/lib/quickStatuses'
import { getPartnerName } from '@/lib/statusConfig'
import type { StatusFormData } from './StatusButtons'

// ── Storage ───────────────────────────────────────────────────────────────────

type QS = { label: string; emoji: string }
// Per-user, per-category ordered list. Undefined = use built-in defaults.
type QSData = Partial<Record<CategoryId, QS[]>>

const STORAGE_KEY = (userId: string) => `annette_qs_v2_${userId}`

function loadQSData(userId: string): QSData {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveQSData(userId: string, data: QSData) {
  try { localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(data)) } catch { /* noop */ }
}

function getList(catId: CategoryId, data: QSData): QS[] {
  return data[catId] ?? [...QUICK_STATUSES[catId]]
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  userId: string
  userMascot: string
  onSubmit: (data: StatusFormData) => void
  loading?: boolean
}

export default function CategoryPicker({ userId, userMascot, onSubmit, loading }: Props) {
  // Selection state
  const [catId, setCatId] = useState<CategoryId | null>(null)
  const [selectedQuick, setSelectedQuick] = useState<QS | null>(null)
  const [customText, setCustomText] = useState('')
  const [note, setNote] = useState('')
  const [isShared, setIsShared] = useState(false)

  // QS data (localStorage)
  const [qsData, setQsData] = useState<QSData>({})

  // Manage mode state
  const [manageMode, setManageMode] = useState(false)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<QS>({ label: '', emoji: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [newDraft, setNewDraft] = useState<QS>({ label: '', emoji: '✨' })

  // Drag state
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null)
  const [dragOverLabel, setDragOverLabel] = useState<string | null>(null)

  const editInputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQsData(loadQSData(userId)) }, [userId])

  const partnerName = getPartnerName(userId)
  const cat = catId ? getCategory(catId) : null
  const quickList = useMemo<QS[]>(() => (catId ? getList(catId, qsData) : []), [catId, qsData])

  // ── QS mutation helpers ────────────────────────────────────────────────────

  const commitList = useCallback((id: CategoryId, list: QS[]) => {
    setQsData(prev => {
      const next = { ...prev, [id]: list }
      saveQSData(userId, next)
      return next
    })
  }, [userId])

  const deleteQS = useCallback((label: string) => {
    if (!catId) return
    commitList(catId, quickList.filter(q => q.label !== label))
    if (selectedQuick?.label === label) setSelectedQuick(null)
  }, [catId, quickList, selectedQuick, commitList])

  const startEdit = useCallback((qs: QS) => {
    setEditingLabel(qs.label)
    setEditDraft({ ...qs })
    setTimeout(() => editInputRef.current?.focus(), 50)
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingLabel || !editDraft.label.trim() || !catId) { setEditingLabel(null); return }
    const label = editDraft.label.trim()
    const emoji = editDraft.emoji || '✨'
    commitList(catId, quickList.map(q => q.label === editingLabel ? { label, emoji } : q))
    if (selectedQuick?.label === editingLabel) setSelectedQuick({ label, emoji })
    setEditingLabel(null)
  }, [editingLabel, editDraft, catId, quickList, selectedQuick, commitList])

  const moveQS = useCallback((label: string, dir: -1 | 1) => {
    if (!catId) return
    const list = [...quickList]
    const i = list.findIndex(q => q.label === label)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    commitList(catId, list)
  }, [catId, quickList, commitList])

  const addNew = useCallback(() => {
    if (!catId || !newDraft.label.trim()) { setAddingNew(false); return }
    commitList(catId, [...quickList, { label: newDraft.label.trim(), emoji: newDraft.emoji || '✨' }])
    setNewDraft({ label: '', emoji: '✨' })
    setAddingNew(false)
  }, [catId, quickList, newDraft, commitList])

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const onDragStart = useCallback((label: string) => setDraggingLabel(label), [])

  const onDragOver = useCallback((e: React.DragEvent, label: string) => {
    e.preventDefault()
    if (label !== draggingLabel) setDragOverLabel(label)
  }, [draggingLabel])

  const onDrop = useCallback((targetLabel: string) => {
    if (!catId || !draggingLabel || draggingLabel === targetLabel) {
      setDraggingLabel(null); setDragOverLabel(null); return
    }
    const list = [...quickList]
    const fromIdx = list.findIndex(q => q.label === draggingLabel)
    const toIdx = list.findIndex(q => q.label === targetLabel)
    if (fromIdx >= 0 && toIdx >= 0) {
      const [item] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, item)
      commitList(catId, list)
    }
    setDraggingLabel(null); setDragOverLabel(null)
  }, [catId, draggingLabel, quickList, commitList])

  // ── Navigation ─────────────────────────────────────────────────────────────

  const pickCategory = useCallback((id: CategoryId) => {
    if (id === catId) {
      setCatId(null); setSelectedQuick(null); setCustomText('')
      setNote(''); setIsShared(false); setManageMode(false)
    } else {
      setCatId(id); setSelectedQuick(null); setCustomText('')
      setManageMode(false); setAddingNew(false); setEditingLabel(null)
    }
  }, [catId])

  const handleSubmit = useCallback(() => {
    if (!customText.trim() && !selectedQuick || !cat) return
    const status = selectedQuick?.label ?? customText.trim()
    const emoji = selectedQuick?.emoji ?? cat.emoji
    if (!status) return
    onSubmit({ status, emoji, note, color: cat.color, startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), isShared, category: cat.id })
    setCatId(null); setSelectedQuick(null); setCustomText(''); setNote(''); setIsShared(false)
  }, [selectedQuick, customText, cat, note, isShared, onSubmit])

  const statusText = selectedQuick?.label ?? customText.trim()
  const statusEmoji = selectedQuick?.emoji ?? cat?.emoji ?? '✨'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg overflow-hidden">

      {/* Category grid — colored text-only buttons */}
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

      {/* Expanded panel when category is selected */}
      <AnimatePresence>
        {catId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100/70">

              {/* ── MANAGE MODE ───────────────────────────────────────────── */}
              {manageMode ? (
                <div className="pt-3 space-y-1.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      Manage {cat?.label}
                    </p>
                    <button
                      onClick={() => { setManageMode(false); setEditingLabel(null); setAddingNew(false) }}
                      className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 px-2 py-0.5 rounded-full hover:bg-violet-50 transition-colors"
                    >
                      Done ✓
                    </button>
                  </div>

                  {quickList.map((qs, i) =>
                    editingLabel === qs.label ? (
                      // Inline edit row
                      <div key={qs.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border-2 border-violet-300 bg-white shadow-sm">
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
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingLabel(null) }}
                          className="flex-1 text-xs font-semibold outline-none text-gray-700 min-w-0"
                          placeholder="Label"
                        />
                        <button onClick={saveEdit}
                          className="text-[10px] text-violet-500 font-bold px-2 py-0.5 rounded-full hover:bg-violet-50 shrink-0">
                          Save
                        </button>
                      </div>
                    ) : (
                      // Draggable manage row
                      <div
                        key={qs.label}
                        draggable
                        onDragStart={() => onDragStart(qs.label)}
                        onDragOver={e => onDragOver(e, qs.label)}
                        onDrop={() => onDrop(qs.label)}
                        onDragEnd={() => { setDraggingLabel(null); setDragOverLabel(null) }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all duration-100 select-none"
                        style={{
                          backgroundColor: dragOverLabel === qs.label ? cat!.color + '40' : 'rgba(249,250,251,0.9)',
                          borderColor: dragOverLabel === qs.label ? cat!.color : 'transparent',
                          opacity: draggingLabel === qs.label ? 0.4 : 1,
                          cursor: draggingLabel ? 'grabbing' : 'grab',
                        }}
                      >
                        {/* Drag handle */}
                        <span className="text-gray-300 text-[11px] leading-none shrink-0 font-bold tracking-tighter">⠿⠿</span>
                        <span className="text-sm shrink-0">{qs.emoji}</span>
                        <span className="flex-1 text-xs font-semibold text-gray-700 min-w-0 truncate">{qs.label}</span>
                        {/* Up / Down — touch-friendly fallback for mobile */}
                        <button onClick={() => moveQS(qs.label, -1)} disabled={i === 0}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 disabled:opacity-20 text-[10px] shrink-0">
                          ↑
                        </button>
                        <button onClick={() => moveQS(qs.label, 1)} disabled={i === quickList.length - 1}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-200 disabled:opacity-20 text-[10px] shrink-0">
                          ↓
                        </button>
                        {/* Edit */}
                        <button onClick={() => startEdit(qs)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-violet-100 text-violet-400 text-[10px] shrink-0 transition-colors">
                          ✏
                        </button>
                        {/* Delete */}
                        <button onClick={() => deleteQS(qs.label)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-red-400 text-[11px] shrink-0 transition-colors">
                          ×
                        </button>
                      </div>
                    )
                  )}

                  {/* Add new */}
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
                      <button onClick={addNew}
                        className="text-[10px] text-violet-500 font-bold px-2 py-0.5 rounded-full hover:bg-violet-50 shrink-0">
                        Add
                      </button>
                      <button onClick={() => setAddingNew(false)}
                        className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full hover:bg-gray-100 shrink-0">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingNew(true); setTimeout(() => newInputRef.current?.focus(), 50) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-violet-300 hover:text-violet-400 transition-colors text-[11px] font-semibold"
                    >
                      <span>+</span>
                      <span>Add new status</span>
                    </button>
                  )}
                </div>
              ) : (
                /* ── SELECT MODE ────────────────────────────────────────────── */
                <div className="pt-3 space-y-2.5">
                  {/* Quick status pills + Edit shortcut */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {quickList.map(qs => {
                      const isActive = selectedQuick?.label === qs.label
                      return (
                        <button
                          key={qs.label}
                          onClick={() => {
                            setSelectedQuick(prev => prev?.label === qs.label ? null : qs)
                            setCustomText('')
                          }}
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
