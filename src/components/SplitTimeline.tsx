'use client'

import { useEffect, useState, useMemo, memo } from 'react'
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

const PX_PER_MIN = 1.5 // 90px per hour

function minOfDay(d: Date) { return d.getHours() * 60 + d.getMinutes() }

function hourLabel(h: number) {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function fmtMs(ms: number) {
  const m = Math.floor(ms / 60000)
  return Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

// Floating tooltip shown on hover for compact entries
const EntryTooltip = memo(function EntryTooltip({ entry }: { entry: StatusEntry }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[190px] pointer-events-none
                    bg-white/98 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3">
      <p className="font-bold text-xs text-gray-700 leading-snug">{entry.emoji} {entry.status}</p>
      <p className="text-[10px] text-gray-500 mt-1">
        {formatTime(entry.startTime)}{entry.endTime ? ` – ${formatTime(entry.endTime)}` : ' → Now'}
      </p>
      {entry.note && <p className="text-[10px] text-gray-400 italic mt-1 leading-snug">{entry.note}</p>}
      {entry.isShared && <p className="text-[10px] text-green-600 font-semibold mt-1">🐧💚🦕 Together</p>}
    </div>
  )
})

const EntryBlock = memo(function EntryBlock({
  entry, top, height, isTogether, onEdit, onDelete,
}: {
  entry: StatusEntry
  top: number
  height: number
  isTogether: boolean
  onEdit?: (e: StatusEntry) => void
  onDelete?: (id: string) => void
}) {
  const px = Math.max(height, 26)
  const isCompact = height < 52
  const isTiny = height < 30
  const isActive = !entry.endTime

  return (
    <div
      className={`group absolute left-0.5 right-0.5 rounded-xl overflow-visible transition-shadow ${
        isTogether
          ? 'border-l-[3px] border-green-400 shadow-[0_0_10px_rgba(134,239,172,0.45)] ring-1 ring-green-200/70'
          : 'border border-white/70 shadow-sm'
      }`}
      style={{ top, height: px, backgroundColor: entry.color, zIndex: isCompact ? 5 : 2 }}
    >
      {/* Tooltip for short entries */}
      {isCompact && (
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50">
          <EntryTooltip entry={entry} />
        </div>
      )}

      {/* Active pulse dot */}
      {isActive && (
        <span className="absolute top-1.5 right-5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-10" />
      )}

      {/* Edit / Delete on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/95 rounded-lg px-1 py-0.5 shadow z-20">
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(entry) }} className="p-0.5 rounded hover:bg-violet-100 text-violet-400">
              <Pencil size={9} />
            </button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(entry.id) }} className="p-0.5 rounded hover:bg-red-100 text-red-400">
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}

      {/* Card content — minimal for tiny entries, full for normal */}
      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-0.5 min-w-0">
          <span className="text-xs leading-none flex-shrink-0">{entry.emoji}</span>
          {!isTiny && (
            <span className={`font-bold text-gray-700 truncate leading-tight ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
              {entry.status}{isSleepStatus(entry.status) ? ' 😴' : ''}
            </span>
          )}
        </div>
        {!isCompact && (
          <>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-tight whitespace-nowrap">
              {formatTime(entry.startTime)}{isActive ? ' → Now' : entry.endTime ? ` – ${formatTime(entry.endTime)}` : ''}
            </p>
            {isTogether && (
              <span className="text-[8px] text-green-700 font-bold mt-0.5 leading-tight">💚 Together</span>
            )}
            {entry.note && (
              <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-4 break-words leading-snug">{entry.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
})

export default function SplitTimeline({ entries, date, onEdit, onDelete, onPrevDay, onNextDay }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const dateLabel = useMemo(() => formatDate(parseISO(date)), [date])

  const { jEntries, aEntries } = useMemo(() => ({
    jEntries: entries.filter(e => e.userId === 'jeanette'),
    aEntries: entries.filter(e => e.userId === 'anthony'),
  }), [entries])

  // View window: snap to hour boundaries with 30-min padding around actual entries
  const { vsm, vem, totalH, hours } = useMemo(() => {
    if (entries.length === 0) {
      const hours = Array.from({ length: 15 }, (_, i) => i + 8)
      return { vsm: 480, vem: 1320, totalH: 840 * PX_PER_MIN, hours }
    }
    const mins = entries.flatMap(e => {
      const s = minOfDay(new Date(e.startTime))
      const rawE = e.endTime ? minOfDay(new Date(e.endTime)) : minOfDay(now)
      return [s, rawE >= s ? rawE : 24 * 60]
    })
    const lo = Math.floor(Math.max(0, Math.min(...mins) - 30) / 60) * 60
    const hi = Math.min(Math.ceil((Math.max(...mins) + 30) / 60) * 60, 1440)
    const hours: number[] = []
    for (let h = lo / 60; h <= hi / 60; h++) hours.push(h)
    return { vsm: lo, vem: hi, totalH: (hi - lo) * PX_PER_MIN, hours }
  }, [entries, now])

  // Overlap detection: produces both overlapMap (glow) and connector bars
  const { overlapMap, connectors } = useMemo(() => {
    const sharedJ = jEntries.filter(e => e.isShared)
    const sharedA = aEntries.filter(e => e.isShared)
    const overlapMap = new Map<string, number>()
    const connectors: { top: number; height: number; ms: number }[] = []

    for (const j of sharedJ) {
      const jS = new Date(j.startTime).getTime()
      const jE = j.endTime ? new Date(j.endTime).getTime() : now.getTime()
      for (const a of sharedA) {
        const aS = new Date(a.startTime).getTime()
        const aE = a.endTime ? new Date(a.endTime).getTime() : now.getTime()
        const os = Math.max(jS, aS)
        const oe = Math.min(jE, aE)
        if (os >= oe) continue
        const ms = oe - os
        overlapMap.set(j.id, (overlapMap.get(j.id) ?? 0) + ms)
        overlapMap.set(a.id, (overlapMap.get(a.id) ?? 0) + ms)
        const osM = minOfDay(new Date(os))
        const oeM = minOfDay(new Date(oe))
        connectors.push({
          top: (osM - vsm) * PX_PER_MIN,
          height: Math.max((oeM - osM) * PX_PER_MIN, 8),
          ms,
        })
      }
    }
    return { overlapMap, connectors }
  }, [jEntries, aEntries, now, vsm])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const nowTop = (minOfDay(now) - vsm) * PX_PER_MIN
  const showNowLine = date === todayStr && minOfDay(now) >= vsm && minOfDay(now) <= vem

  const renderCol = (list: StatusEntry[]) => list.map(entry => {
    const s = minOfDay(new Date(entry.startTime))
    const rawE = entry.endTime ? minOfDay(new Date(entry.endTime)) : minOfDay(now)
    const e = rawE >= s ? rawE : 1440
    return (
      <EntryBlock
        key={entry.id}
        entry={entry}
        top={(s - vsm) * PX_PER_MIN}
        height={(e - s) * PX_PER_MIN}
        isTogether={(overlapMap.get(entry.id) ?? 0) > 0}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
  })

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
          {(onPrevDay || onNextDay) && (
            <div className="flex gap-0.5">
              <button onClick={onPrevDay} className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={onNextDay} disabled={!onNextDay} className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 font-medium mt-0.5">{dateLabel}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-3xl mb-2">🌸</div>
          <p className="text-gray-400 text-sm font-medium">No activities yet</p>
          <p className="text-gray-300 text-xs mt-0.5">Set a status to get started!</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid flex-shrink-0" style={{ gridTemplateColumns: '38px 1fr 14px 1fr' }}>
            <div />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-l border-gray-100" style={{ backgroundColor: '#ede9fe' }}>
              <span className="text-sm">🐧</span>
              <span className="font-bold text-[11px] text-violet-700">Jeanette</span>
            </div>
            <div className="bg-green-50/30 border-x border-gray-100/40" />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-gray-100" style={{ backgroundColor: '#fef9c3' }}>
              <span className="text-sm">🦕</span>
              <span className="font-bold text-[11px] text-amber-700">Anthony</span>
            </div>
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="relative" style={{ display: 'grid', gridTemplateColumns: '38px 1fr 14px 1fr', height: totalH }}>

              {/* Time axis */}
              <div className="relative border-r border-gray-100/60">
                {hours.map(h => (
                  <div key={h} className="absolute right-1 flex items-center" style={{ top: (h * 60 - vsm) * PX_PER_MIN - 5 }}>
                    <span className="text-[8px] text-gray-400 font-medium leading-none whitespace-nowrap">{hourLabel(h)}</span>
                  </div>
                ))}
              </div>

              {/* Jeanette column */}
              <div className="relative border-l border-gray-100/40">
                {hours.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/50" style={{ top: (h * 60 - vsm) * PX_PER_MIN }} />
                ))}
                {showNowLine && <div className="absolute left-0 right-0 border-t-2 border-red-400/40 z-10" style={{ top: nowTop }} />}
                {renderCol(jEntries)}
              </div>

              {/* Together connector column */}
              <div className="relative">
                {connectors.map((c, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0.5 rounded-full"
                    style={{
                      top: c.top,
                      height: c.height,
                      background: 'linear-gradient(to bottom, rgba(134,239,172,0.5), rgba(74,222,128,0.3))',
                      boxShadow: '0 0 6px rgba(134,239,172,0.6)',
                    }}
                  >
                    {c.height >= 24 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[7px] leading-none select-none">💚</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Anthony column */}
              <div className="relative border-r border-gray-100/40">
                {hours.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/50" style={{ top: (h * 60 - vsm) * PX_PER_MIN }} />
                ))}
                {showNowLine && <div className="absolute left-0 right-0 border-t-2 border-red-400/40 z-10" style={{ top: nowTop }} />}
                {renderCol(aEntries)}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
