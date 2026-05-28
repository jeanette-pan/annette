'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import Navbar from '@/components/Navbar'
import AnimatedBackground from '@/components/AnimatedBackground'
import { useCurrentUser } from '@/components/UserSelector'
import { getUserConfig, PASTEL_COLORS } from '@/lib/statusConfig'

type StatusTemplate = {
  id: string
  userId: string
  name: string
  status: string
  emoji: string
  color: string
  note?: string | null
  isShared: boolean
  sortOrder: number
  createdAt: string
}

type FormState = {
  name: string
  status: string
  emoji: string
  color: string
  note: string
  isShared: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  status: '',
  emoji: '✨',
  color: PASTEL_COLORS[0].hex,
  note: '',
  isShared: false,
}

export default function TemplatesPage() {
  const currentUser = useCurrentUser()
  const [templates, setTemplates] = useState<StatusTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  // Drag state
  const dragId = useRef<string | null>(null)
  const dragOverId = useRef<string | null>(null)

  const userConfig = currentUser ? getUserConfig(currentUser.userId) : null

  // Only show templates owned by the current user (for reordering)
  const ownTemplates = templates.filter(t => t.userId === currentUser?.userId)
  const partnerTemplates = templates.filter(t => t.userId !== currentUser?.userId)

  const fetchTemplates = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/templates?userId=${currentUser.userId}`)
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleCreate = async () => {
    if (!currentUser || !form.name.trim() || !form.status.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          name: form.name.trim(),
          status: form.status.trim(),
          emoji: form.emoji.trim() || '✨',
          color: form.color,
          note: form.note.trim() || undefined,
          isShared: form.isShared,
          sortOrder: ownTemplates.length,
        }),
      })
      if (res.ok) {
        setForm(DEFAULT_FORM)
        await fetchTemplates()
      }
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  const startEdit = (tpl: StatusTemplate) => {
    setEditingId(tpl.id)
    setEditForm({ name: tpl.name, status: tpl.status, emoji: tpl.emoji, color: tpl.color, note: tpl.note ?? '', isShared: tpl.isShared })
  }

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim() || !editForm.status.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/templates/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(), status: editForm.status.trim(),
          emoji: editForm.emoji.trim() || '✨', color: editForm.color,
          note: editForm.note.trim() || null, isShared: editForm.isShared,
        }),
      })
      if (res.ok) { setEditingId(null); await fetchTemplates() }
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    setDeleting(id)
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      await fetchTemplates()
    } catch { /* silent */ } finally {
      setDeleting(null)
    }
  }

  // Save new order to server
  const saveOrder = useCallback(async (ordered: StatusTemplate[]) => {
    setReordering(true)
    try {
      await fetch('/api/templates/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: ordered.map((t, i) => ({ id: t.id, sortOrder: i })) }),
      })
    } catch { /* silent */ } finally {
      setReordering(false)
    }
  }, [])

  const moveTemplate = useCallback((id: string, direction: 'up' | 'down') => {
    setTemplates(prev => {
      const own = prev.filter(t => t.userId === currentUser?.userId)
      const idx = own.findIndex(t => t.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= own.length) return prev
      const reordered = [...own]
      ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
      saveOrder(reordered)
      const others = prev.filter(t => t.userId !== currentUser?.userId)
      return [...reordered, ...others]
    })
  }, [currentUser, saveOrder])

  // Drag-and-drop handlers (desktop)
  const handleDragStart = (id: string) => { dragId.current = id }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    dragOverId.current = id
  }
  const handleDrop = () => {
    const from = dragId.current
    const to = dragOverId.current
    if (!from || !to || from === to) { dragId.current = null; dragOverId.current = null; return }
    setTemplates(prev => {
      const own = prev.filter(t => t.userId === currentUser?.userId)
      const fromIdx = own.findIndex(t => t.id === from)
      const toIdx = own.findIndex(t => t.id === to)
      if (fromIdx < 0 || toIdx < 0) return prev
      const reordered = [...own]
      const [moved] = reordered.splice(fromIdx, 1)
      reordered.splice(toIdx, 0, moved)
      saveOrder(reordered)
      const others = prev.filter(t => t.userId !== currentUser?.userId)
      return [...reordered, ...others]
    })
    dragId.current = null
    dragOverId.current = null
  }

  const TemplateCard = ({ tpl, isOwn }: { tpl: StatusTemplate; isOwn: boolean }) => {
    const ownIdx = ownTemplates.findIndex(t => t.id === tpl.id)
    return (
      <motion.div
        key={tpl.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        draggable={isOwn}
        onDragStart={isOwn ? () => handleDragStart(tpl.id) : undefined}
        onDragOver={isOwn ? (e) => handleDragOver(e, tpl.id) : undefined}
        onDrop={isOwn ? handleDrop : undefined}
        className={isOwn ? 'cursor-grab active:cursor-grabbing' : ''}
      >
        {editingId === tpl.id ? (
          <div className="rounded-2xl border border-white/60 p-4 space-y-3" style={{ backgroundColor: editForm.color }}>
            <div className="flex gap-2">
              <input type="text" value={editForm.emoji} onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                maxLength={4} className="w-14 text-center text-xl border-2 border-white/60 rounded-xl p-2 focus:outline-none bg-white/70" />
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Template name" className="flex-1 border-2 border-white/60 rounded-xl px-3 py-2 font-semibold text-gray-700 focus:outline-none bg-white/70" />
            </div>
            <input type="text" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              placeholder="Status text" className="w-full border-2 border-white/60 rounded-xl px-3 py-2 text-gray-700 focus:outline-none bg-white/70" />
            <textarea value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              placeholder="Note (optional)" rows={2}
              className="w-full border-2 border-white/60 rounded-xl px-3 py-2 text-gray-700 focus:outline-none bg-white/70 resize-none text-sm" />
            <div className="flex flex-wrap gap-1.5">
              {PASTEL_COLORS.map((c) => (
                <button key={c.hex} onClick={() => setEditForm({ ...editForm, color: c.hex })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${editForm.color === c.hex ? 'border-gray-500 scale-125' : 'border-white/80'}`}
                  style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <button type="button" onClick={() => setEditForm(f => ({ ...f, isShared: !f.isShared }))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all text-sm ${editForm.isShared ? 'bg-green-50 border-green-300' : 'bg-white/50 border-white/60'}`}>
              <span className={`font-semibold ${editForm.isShared ? 'text-green-700' : 'text-gray-500'}`}>
                {editForm.isShared ? '💚 Shared with partner' : '🤍 Only visible to me'}
              </span>
              <div className={`w-8 h-4 rounded-full flex items-center ${editForm.isShared ? 'bg-green-400' : 'bg-gray-300'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow transition-all ${editForm.isShared ? 'ml-4' : 'ml-0.5'}`} />
              </div>
            </button>
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 rounded-full py-2 font-bold text-white text-sm bg-green-400 hover:bg-green-500 disabled:opacity-40 transition-colors">
                {saving ? 'Saving...' : 'Save Changes ✅'}
              </button>
              <button onClick={() => setEditingId(null)}
                className="px-4 rounded-full py-2 font-bold text-gray-600 text-sm bg-white/70 hover:bg-white/90 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-white/60 p-3.5" style={{ backgroundColor: tpl.color }}>
            {/* Drag handle (desktop) */}
            {isOwn && (
              <div className="text-gray-300 hover:text-gray-500 flex-shrink-0 cursor-grab touch-none select-none">
                <GripVertical size={14} />
              </div>
            )}
            <span className="text-2xl flex-shrink-0">{tpl.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-gray-700 text-sm truncate">{tpl.name}</p>
                {tpl.isShared && <span className="text-xs flex-shrink-0">💚</span>}
                {!isOwn && <span className="text-[10px] text-gray-400 bg-white/50 rounded-full px-1.5 py-0.5 flex-shrink-0">partner</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">{tpl.status}</p>
              {tpl.note && <p className="text-xs text-gray-400 italic truncate">{tpl.note}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Up/down reorder (mobile-friendly) */}
              {isOwn && (
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveTemplate(tpl.id, 'up')} disabled={ownIdx === 0}
                    className="p-0.5 rounded hover:bg-white/60 text-gray-400 disabled:opacity-20 transition-colors touch-manipulation">
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={() => moveTemplate(tpl.id, 'down')} disabled={ownIdx === ownTemplates.length - 1}
                    className="p-0.5 rounded hover:bg-white/60 text-gray-400 disabled:opacity-20 transition-colors touch-manipulation">
                    <ChevronDown size={13} />
                  </button>
                </div>
              )}
              {isOwn && (
                <>
                  <button onClick={() => startEdit(tpl)}
                    className="text-xs font-semibold text-gray-600 bg-white/70 hover:bg-white/90 px-2.5 py-1.5 rounded-full transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} disabled={deleting === tpl.id}
                    className="text-xs font-semibold text-red-500 bg-white/70 hover:bg-red-50 px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-40">
                    {deleting === tpl.id ? '...' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-yellow-50 to-green-50">
      <AnimatedBackground />
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold" style={{ color: userConfig?.accentHex ?? '#8b5cf6' }}>
            Your Templates {userConfig?.mascot ?? '📋'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Save your favourite statuses for quick access</p>
        </div>

        {!currentUser ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-12 text-center">
            <div className="text-4xl mb-3 animate-bounce-soft">🐧</div>
            <p className="text-gray-400 font-medium">Select who you are first!</p>
          </div>
        ) : (
          <>
            {/* Create form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6 space-y-4">
              <h2 className="text-lg font-bold text-violet-700">Add a Template ✨</h2>
              <div className="flex gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Emoji</label>
                  <input type="text" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    maxLength={4} className="w-16 text-center text-2xl border-2 border-violet-200 rounded-2xl p-2.5 focus:outline-none focus:border-violet-400 bg-violet-50" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Template Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Coffee Time"
                    className="w-full border-2 border-violet-200 rounded-2xl px-4 py-3 font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Status Text</label>
                <input type="text" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  placeholder="e.g. sipping coffee ☕"
                  className="w-full border-2 border-violet-200 rounded-2xl px-4 py-3 font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Note (optional)</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Default note for this template..." rows={2}
                  className="w-full border-2 border-violet-200 rounded-2xl px-4 py-3 text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50/50 placeholder:text-gray-300 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wide">Color</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PASTEL_COLORS.map((c) => (
                    <button key={c.hex} onClick={() => setForm({ ...form, color: c.hex })} title={c.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${form.color === c.hex ? 'border-gray-500 scale-125 shadow-md' : 'border-white/80 hover:scale-110'}`}
                      style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
                <div className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 border border-white/60 shadow-sm" style={{ backgroundColor: form.color }}>
                  {form.emoji} {form.name || form.status || 'Preview...'}
                </div>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${form.isShared ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2">
                  <span>{form.isShared ? '💚' : '🤍'}</span>
                  <span className={`font-semibold text-sm ${form.isShared ? 'text-green-700' : 'text-gray-500'}`}>
                    {form.isShared ? 'Shared with partner 🐧🦕' : 'Only visible to me'}
                  </span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all flex items-center ${form.isShared ? 'bg-green-400' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${form.isShared ? 'ml-5' : 'ml-0.5'}`} />
                </div>
              </button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleCreate} disabled={!form.name.trim() || !form.status.trim() || saving}
                style={currentUser?.userId === 'anthony' ? { backgroundColor: '#FEE12B' } : {}}
                className={`w-full rounded-full px-6 py-3.5 font-bold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${currentUser?.userId === 'anthony' ? 'text-gray-900 hover:brightness-95' : 'text-white bg-violet-400 hover:bg-violet-500'}`}>
                {saving ? 'Saving...' : 'Save Template 💾'}
              </motion.button>
            </div>

            {/* Templates list */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-violet-700">Your Templates 📋</h2>
                {reordering && <span className="text-xs text-gray-400">Saving order...</span>}
              </div>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="text-3xl animate-bounce-soft mb-2">📋</div>
                  <p className="text-gray-400 font-medium">Loading templates...</p>
                </div>
              ) : ownTemplates.length === 0 && partnerTemplates.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-3xl mb-2">{userConfig?.mascot}</div>
                  <p className="text-gray-400 font-medium">No templates yet!</p>
                  <p className="text-gray-300 text-sm mt-1">Create your first template above.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {ownTemplates.map((tpl) => (
                      <TemplateCard key={tpl.id} tpl={tpl} isOwn={true} />
                    ))}
                  </AnimatePresence>
                  {partnerTemplates.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2">Shared by partner</p>
                      <AnimatePresence>
                        {partnerTemplates.map((tpl) => (
                          <TemplateCard key={tpl.id} tpl={tpl} isOwn={false} />
                        ))}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}
              <p className="text-[10px] text-gray-300 text-center mt-4">
                Drag rows to reorder on desktop · Use ↑↓ arrows on mobile
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
