'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  onPrevDay?: () => void
  onNextDay?: () => void
}

function fmtMs(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function EntryCard({
  entry,
  now,
  overlapMs,
  onEdit,
  onDelete,
}: {
  entry: StatusEntry
  now: Date
  overlapMs?: number
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
  const isTogether = overlapMs && overlapMs > 0

  return (
    <div
      className={`group relative rounded-2xl p-2.5 border shadow-sm overflow-hidden transition-all duration-300 ${
        isTogether
          ? 'border-green-300 shadow-[0_0_14px_rgba(134,239,172,0.45)] ring-1 ring-green-200'
          : 'border-white/70'
      }`}
      style={{ backgroundColor: entry.color, minHeight: `${minHeight}px` }}
    >
      {/* Active pulsing dot */}
      {isActive && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full border-2 border-white animate-pulse z-10" />
      )}

      {/* Edit/delete on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1 bg-white/95 rounded-xl px-1.5 py-1 shadow-md z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
              className="p-1 rounded-lg hover:bg-violet-100 text-violet-400 transition-colors"
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

      {/* Together time badge */}
      {isTogether && (
        <div className="mt-1.5 flex items-center gap-1 bg-green-100/90 rounded-lg px-2 py-0.5 w-fit">
          <span className="text-[9px]">🐧💚🦕</span>
          <span className="text-[9px] font-bold text-green-700">Together · {fmtMs(overlapMs)}</span>
        </div>
      )}

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
  overlapMap,
  onEdit,
  onDelete,
}: {
  mascot: string
  name: string
  headerBg: string
  accentColor: string
  entries: StatusEntry[]
  now: Date
  overlapMap: Map<string, number>
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
}) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div
        className="flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-white/60 shadow-sm"
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xl flex-shrink-0">{mascot}</span>
        <span className="font-bold text-sm" style={{ color: accentColor }}>{name}</span>
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
            <EntryCard
              key={entry.id}
              entry={entry}
              now={now}
              overlapMs={overlapMap.get(entry.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
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

export default function SplitTimeline({ entries, date, onEdit, onDelete, onPrevDay, onNextDay }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const dateLabel = formatDate(parseISO(date))
  const jeanetteEntries = entries.filter(e => e.userId === 'jeanette')
  const anthonyEntries = entries.filter(e => e.userId === 'anthony')
  const sharedOverlaps = findSharedOverlaps(jeanetteEntries, anthonyEntries, now)

  // Build a map of entryId → total overlap ms for together-time glowing
  const overlapMap = new Map<string, number>()
  for (const overlap of sharedOverlaps) {
    const ms = overlap.overlapEnd.getTime() - overlap.overlapStart.getTime()
    overlapMap.set(overlap.jEntry.id, (overlapMap.get(overlap.jEntry.id) ?? 0) + ms)
    overlapMap.set(overlap.aEntry.id, (overlapMap.get(overlap.aEntry.id) ?? 0) + ms)
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Sticky header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100/80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
          {(onPrevDay || onNextDay) && (
            <div className="flex items-center gap-1">
              <button
                onClick={onPrevDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors"
                title="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={onNextDay}
                disabled={!onNextDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 font-medium">{dateLabel}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">🌸</div>
            <p className="text-gray-400 font-medium">No activities yet today</p>
            <p className="text-gray-300 text-sm mt-1">Set a status to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UserColumn
              mascot="🐧"
              name="Jeanette"
              headerBg="#ede9fe"
              accentColor="#8b5cf6"
              entries={jeanetteEntries}
              now={now}
              overlapMap={overlapMap}
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
              overlapMap={overlapMap}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}
