'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatTime, formatDate, formatDurationFromDates, isSleepStatus } from '@/lib/utils'
import { parseISO } from 'date-fns'

type StatusEntry = {
  id: string
  userId: string
  userName: string
  status: string
  emoji: string
  color: string
  note?: string | null
  startTime: string | Date
  endTime?: string | Date | null
  date: string
  isShared?: boolean
}

type Props = {
  entries: StatusEntry[]
  date: string
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
}

function EntryCard({
  entry,
  now,
  onEdit,
  onDelete,
}: {
  entry: StatusEntry
  now: Date
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
}) {
  const isActive = !entry.endTime
  const start = new Date(entry.startTime)
  const end = entry.endTime ? new Date(entry.endTime) : null
  const durationMs = (end ?? now).getTime() - start.getTime()
  const durationMinutes = Math.floor(Math.max(0, durationMs) / 60000)
  const minHeight = Math.max(52, Math.min(140, durationMinutes * 0.5))
  const isSleep = isSleepStatus(entry.status)

  return (
    <div
      className="group relative rounded-2xl p-2.5 border border-white/70 shadow-sm overflow-hidden"
      style={{ backgroundColor: entry.color, minHeight: `${minHeight}px` }}
    >
      {/* Active pulsing dot */}
      {isActive && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full border-2 border-white animate-pulse z-10" />
      )}

      {/* Edit/delete buttons on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1 bg-white/95 rounded-xl px-1.5 py-1 shadow-md z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
              className="p-1 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors"
              title="Edit"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-1 pr-6 min-w-0">
        <span className="text-sm flex-shrink-0 leading-tight">{entry.emoji}</span>
        <span className="font-bold text-gray-700 text-[11px] leading-snug break-words min-w-0 flex-1">{entry.status}</span>
        {isSleep && (
          <span className="flex-shrink-0 text-[9px] bg-indigo-100 text-indigo-600 rounded-full px-1 py-0.5 font-semibold leading-tight">😴</span>
        )}
        {entry.isShared && !isSleep && (
          <span className="flex-shrink-0 text-[10px] leading-none">💚</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-0.5 text-[10px] text-gray-500 font-medium mt-1 leading-tight">
        <span className="whitespace-nowrap">{formatTime(entry.startTime)}</span>
        {isActive ? (
          <span className="text-green-600 font-bold whitespace-nowrap"> → Now</span>
        ) : entry.endTime ? (
          <span className="whitespace-nowrap"> – {formatTime(entry.endTime)}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-1 text-[10px] text-gray-400 mt-0.5 leading-tight">
        <span>{formatDurationFromDates(entry.startTime, entry.endTime ?? null)}</span>
        {isActive && <span className="text-green-500 font-medium">· active</span>}
      </div>

      {entry.note && (
        <p className="text-[10px] text-gray-500 italic mt-1.5 bg-white/50 rounded-lg px-2 py-1 line-clamp-2 break-words">
          {entry.note}
        </p>
      )}
    </div>
  )
}

function UserColumn({
  mascot,
  name,
  headerBg,
  accentColor,
  entries,
  now,
  onEdit,
  onDelete,
}: {
  mascot: string
  name: string
  headerBg: string
  accentColor: string
  entries: StatusEntry[]
  now: Date
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
}) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const activeEntry = sorted.find(e => !e.endTime)
  const [activeMinutes, setActiveMinutes] = useState<number>(0)

  useEffect(() => {
    if (!activeEntry) return
    const update = () => {
      const mins = Math.floor((Date.now() - new Date(activeEntry.startTime).getTime()) / 60000)
      setActiveMinutes(Math.max(0, mins))
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [activeEntry])

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div
        className="flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-white/60 shadow-sm"
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xl flex-shrink-0">{mascot}</span>
        <span className="font-bold text-sm truncate" style={{ color: accentColor }}>{name}</span>
        {activeEntry && (
          <span className="ml-auto text-xs font-medium text-green-600 flex-shrink-0 whitespace-nowrap">
            {activeMinutes}m ago
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-white/40 rounded-2xl border border-white/60">
          <div className="text-3xl mb-2">{mascot}</div>
          <p className="text-gray-400 text-sm font-medium">Nothing yet today</p>
          <p className="text-gray-300 text-xs mt-0.5">So peaceful! 🌸</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(entry => (
            <EntryCard key={entry.id} entry={entry} now={now} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

type SharedOverlap = {
  jEntry: StatusEntry
  aEntry: StatusEntry
  overlapStart: Date
  overlapEnd: Date
}

function findSharedOverlaps(jEntries: StatusEntry[], aEntries: StatusEntry[], now: Date): SharedOverlap[] {
  const overlaps: SharedOverlap[] = []
  const sharedJ = jEntries.filter(e => e.isShared)
  const sharedA = aEntries.filter(e => e.isShared)

  for (const j of sharedJ) {
    const jStart = new Date(j.startTime).getTime()
    const jEnd = j.endTime ? new Date(j.endTime).getTime() : now.getTime()
    for (const a of sharedA) {
      const aStart = new Date(a.startTime).getTime()
      const aEnd = a.endTime ? new Date(a.endTime).getTime() : now.getTime()
      const overlapStart = Math.max(jStart, aStart)
      const overlapEnd = Math.min(jEnd, aEnd)
      if (overlapStart < overlapEnd) {
        overlaps.push({
          jEntry: j,
          aEntry: a,
          overlapStart: new Date(overlapStart),
          overlapEnd: new Date(overlapEnd),
        })
      }
    }
  }

  return overlaps
}

function fmtMs(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function SplitTimeline({ entries, date, onEdit, onDelete }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const dateLabel = formatDate(parseISO(date))
  const jeanetteEntries = entries.filter(e => e.userId === 'jeanette')
  const anthonyEntries = entries.filter(e => e.userId === 'anthony')
  const sharedOverlaps = findSharedOverlaps(jeanetteEntries, anthonyEntries, now)

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6 h-full">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
        <p className="text-sm text-gray-400 font-medium">{dateLabel}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🌸</div>
          <p className="text-gray-400 font-medium">No activities yet today</p>
          <p className="text-gray-300 text-sm mt-1">Set a status to get started!</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UserColumn
              mascot="🐧"
              name="Jeanette"
              headerBg="#ede9fe"
              accentColor="#8b5cf6"
              entries={jeanetteEntries}
              now={now}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            <UserColumn
              mascot="🦕"
              name="Anthony"
              headerBg="#fef9c3"
              accentColor="#d97706"
              entries={anthonyEntries}
              now={now}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>

          {sharedOverlaps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-green-700">Together Time 💚</span>
                <div className="flex-1 h-px bg-green-200" />
              </div>
              <div className="space-y-2">
                {sharedOverlaps.map((overlap, i) => {
                  const durationMs = overlap.overlapEnd.getTime() - overlap.overlapStart.getTime()
                  return (
                    <div
                      key={i}
                      className="rounded-2xl px-4 py-3 border border-green-200 bg-green-50 shadow-[0_0_16px_rgba(134,239,172,0.4)]"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="flex-shrink-0">🐧</span>
                          <span className="text-xs font-semibold text-gray-600 truncate">{overlap.jEntry.status}</span>
                          <span className="text-gray-300 flex-shrink-0">&</span>
                          <span className="flex-shrink-0">🦕</span>
                          <span className="text-xs font-semibold text-gray-600 truncate">{overlap.aEntry.status}</span>
                        </div>
                        <span className="text-xs font-bold text-green-700 flex-shrink-0">{fmtMs(durationMs)}</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        {formatTime(overlap.overlapStart)} – {formatTime(overlap.overlapEnd)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
