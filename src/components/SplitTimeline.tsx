'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime, formatDate, isSleepStatus } from '@/lib/utils'
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

// 1.5px per minute = 90px per hour
const PX_PER_MIN = 1.5

function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function fmtMs(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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
        overlaps.push({ jEntry: j, aEntry: a, overlapStart: new Date(overlapStart), overlapEnd: new Date(overlapEnd) })
      }
    }
  }
  return overlaps
}

function EntryBlock({
  entry, top, height, overlapMs, onEdit, onDelete,
}: {
  entry: StatusEntry
  top: number
  height: number
  overlapMs?: number
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
}) {
  const isActive = !entry.endTime
  const isTogether = (overlapMs ?? 0) > 0
  const isSleep = isSleepStatus(entry.status)
  const isCompact = height < 48

  return (
    <div
      className={`group absolute left-1 right-1 rounded-xl border overflow-hidden shadow-sm transition-all ${
        isTogether
          ? 'border-green-300 shadow-[0_0_10px_rgba(134,239,172,0.4)] ring-1 ring-green-200'
          : 'border-white/70'
      }`}
      style={{ top, height: Math.max(height, 26), backgroundColor: entry.color }}
    >
      {isActive && (
        <span className="absolute top-1.5 right-6 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-10" />
      )}

      {(onEdit || onDelete) && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/95 rounded-lg px-1 py-0.5 shadow-sm z-20">
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(entry) }} className="p-0.5 rounded hover:bg-violet-100 text-violet-400" title="Edit">
              <Pencil size={9} />
            </button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(entry.id) }} className="p-0.5 rounded hover:bg-red-100 text-red-400" title="Delete">
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}

      <div className={`px-1.5 py-1 h-full flex min-w-0 ${isCompact ? 'flex-row items-center gap-1' : 'flex-col'}`}>
        <div className="flex items-start gap-0.5 min-w-0 flex-1">
          <span className="text-[11px] flex-shrink-0 leading-tight">{entry.emoji}</span>
          <span className={`font-bold text-gray-700 leading-tight break-words min-w-0 flex-1 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
            {entry.status}{isSleep ? ' 😴' : ''}
          </span>
        </div>
        {!isCompact && (
          <>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">
              {formatTime(entry.startTime)}{isActive ? ' → Now' : entry.endTime ? ` – ${formatTime(entry.endTime)}` : ''}
            </p>
            {isTogether && (
              <div className="mt-1 flex items-center gap-0.5 bg-green-100/90 rounded px-1 py-0.5 w-fit">
                <span className="text-[8px]">🐧💚🦕</span>
                <span className="text-[8px] font-bold text-green-700">{fmtMs(overlapMs!)}</span>
              </div>
            )}
            {entry.note && (
              <p className="text-[9px] text-gray-400 italic mt-0.5 bg-white/50 rounded px-1 py-0.5 line-clamp-3 break-words">
                {entry.note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
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
  const overlapMap = new Map<string, number>()
  for (const ov of sharedOverlaps) {
    const ms = ov.overlapEnd.getTime() - ov.overlapStart.getTime()
    overlapMap.set(ov.jEntry.id, (overlapMap.get(ov.jEntry.id) ?? 0) + ms)
    overlapMap.set(ov.aEntry.id, (overlapMap.get(ov.aEntry.id) ?? 0) + ms)
  }

  // Calculate view window from actual entry times, padded to hour boundaries
  const allMins = entries.flatMap(e => {
    const start = minuteOfDay(new Date(e.startTime))
    const rawEnd = e.endTime ? minuteOfDay(new Date(e.endTime)) : minuteOfDay(now)
    // If end appears before start, entry crosses midnight — cap at 24*60
    const end = rawEnd >= start ? rawEnd : 24 * 60
    return [start, end]
  })
  const minMins = allMins.length > 0 ? Math.min(...allMins) : 8 * 60
  const maxMins = allMins.length > 0 ? Math.max(...allMins) : 22 * 60
  const viewStartMin = Math.floor(Math.max(0, minMins - 30) / 60) * 60
  const viewEndMin = Math.min(Math.ceil((maxMins + 30) / 60) * 60, 24 * 60)
  const totalHeight = (viewEndMin - viewStartMin) * PX_PER_MIN

  const hours: number[] = []
  for (let h = viewStartMin / 60; h <= viewEndMin / 60; h++) hours.push(h)

  // Current-time indicator position
  const nowMin = minuteOfDay(now)
  const showNowLine = nowMin >= viewStartMin && nowMin <= viewEndMin && date === new Date().toISOString().slice(0, 10)
  const nowTop = (nowMin - viewStartMin) * PX_PER_MIN

  function renderEntries(list: StatusEntry[]) {
    return list.map(entry => {
      const start = minuteOfDay(new Date(entry.startTime))
      const rawEnd = entry.endTime ? minuteOfDay(new Date(entry.endTime)) : minuteOfDay(now)
      const end = rawEnd >= start ? rawEnd : 24 * 60
      const top = (start - viewStartMin) * PX_PER_MIN
      const height = (end - start) * PX_PER_MIN
      return (
        <EntryBlock
          key={entry.id}
          entry={entry}
          top={top}
          height={height}
          overlapMs={overlapMap.get(entry.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )
    })
  }

  const navButtons = (
    (onPrevDay || onNextDay) ? (
      <div className="flex items-center gap-1">
        <button onClick={onPrevDay} className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors" title="Previous day">
          <ChevronLeft size={16} />
        </button>
        <button onClick={onNextDay} disabled={!onNextDay} className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Next day">
          <ChevronRight size={16} />
        </button>
      </div>
    ) : null
  )

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 overflow-hidden flex flex-col max-h-[82vh]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100/80 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
          {navButtons}
        </div>
        <p className="text-sm text-gray-400 font-medium">{dateLabel}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🌸</div>
          <p className="text-gray-400 font-medium">No activities yet</p>
          <p className="text-gray-300 text-sm mt-1">Set a status to get started!</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[44px_1fr_1fr] border-b border-gray-100/80 flex-shrink-0">
            <div />
            <div className="flex items-center gap-1.5 px-3 py-2 border-l border-gray-100" style={{ backgroundColor: '#ede9fe' }}>
              <span className="text-sm">🐧</span>
              <span className="font-bold text-[11px] text-violet-700">Jeanette</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 border-l border-gray-100" style={{ backgroundColor: '#fef9c3' }}>
              <span className="text-sm">🦕</span>
              <span className="font-bold text-[11px] text-amber-700">Anthony</span>
            </div>
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-[44px_1fr_1fr] relative" style={{ height: totalHeight }}>
              {/* Time axis */}
              <div className="relative border-r border-gray-100/60">
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute right-1.5 flex items-center"
                    style={{ top: (h * 60 - viewStartMin) * PX_PER_MIN - 6 }}
                  >
                    <span className="text-[9px] text-gray-400 font-medium leading-none whitespace-nowrap">{hourLabel(h)}</span>
                  </div>
                ))}
              </div>

              {/* Jeanette column */}
              <div className="relative border-l border-gray-100/40">
                {hours.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/60" style={{ top: (h * 60 - viewStartMin) * PX_PER_MIN }} />
                ))}
                {showNowLine && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/50 z-10" style={{ top: nowTop }} />
                )}
                {renderEntries(jeanetteEntries)}
              </div>

              {/* Anthony column */}
              <div className="relative border-l border-gray-100/40">
                {hours.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/60" style={{ top: (h * 60 - viewStartMin) * PX_PER_MIN }} />
                ))}
                {showNowLine && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/50 z-10" style={{ top: nowTop }} />
                )}
                {renderEntries(anthonyEntries)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
