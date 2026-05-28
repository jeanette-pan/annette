'use client'

import { useMemo, memo, useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { formatTime, formatDate, isSleepStatus } from '@/lib/utils'
import { parseISO } from 'date-fns'

// ── Constants ─────────────────────────────────────────────────────────────────
const PX_PER_MIN = 0.55     // 33 px/hr; full day ≈ 792 px
const TOTAL_H = 1440 * PX_PER_MIN
const TIME_AXIS_W = 32
const CARD_MIN_H = 62
const CARD_MAX_H = 108
const NOTE_LINE_H = 13
const LONG_MIN = 180        // ≥ 3 h → compressed card
const COMPRESSED_H = 48

// Hour markers: every 2 h (12a 2a 4a … 10p)
const HOUR_MARKS = Array.from({ length: 12 }, (_, i) => i * 2)  // [0,2,4,...,22]

// ── Types ─────────────────────────────────────────────────────────────────────
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

type LayoutItem = {
  entry: StatusEntry
  top: number           // TIME-ACCURATE: displayStartMin * PX_PER_MIN
  height: number        // readable, NOT proportional to duration
  isCompressed: boolean
  durationMin: number
  displayStartMin: number   // clamped to [0, 1440] for cross-midnight entries
  displayEndMin: number | null
  lane: number          // 0 = full-width or left half; 1 = right half (overlap)
  laneCount: number     // 1 = no overlap, 2 = two overlapping cards
}

type Props = {
  entries: StatusEntry[]
  date: string
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
  onPrevDay?: () => void
  onNextDay?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function minOfDay(d: Date) { return d.getHours() * 60 + d.getMinutes() }

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function hourLabel(h: number) {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function getCardHeight(entry: StatusEntry, durMin: number): { height: number; isCompressed: boolean } {
  if (durMin > LONG_MIN) return { height: COMPRESSED_H, isCompressed: true }
  const noteLines = entry.note ? Math.min(Math.ceil(entry.note.length / 28), 3) : 0
  return { height: Math.min(CARD_MIN_H + noteLines * NOTE_LINE_H, CARD_MAX_H), isCompressed: false }
}

// Layout a single column.
// Card tops are TIME-ACCURATE (displayStartMin * PX_PER_MIN).
// Visually overlapping cards (due to min-height) are split into two horizontal lanes.
function layoutColumn(entries: StatusEntry[], viewDate: string, now: Date): LayoutItem[] {
  const dayStart = new Date(viewDate + 'T00:00:00')
  const dayEnd   = new Date(viewDate + 'T23:59:59.999')

  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const items: LayoutItem[] = []

  for (const entry of sorted) {
    const rawStartMs = new Date(entry.startTime).getTime()
    const rawEndMs   = entry.endTime ? new Date(entry.endTime).getTime() : now.getTime()

    // Clamp display range to this local day (handles cross-midnight entries)
    const displayStartMs = Math.max(rawStartMs, dayStart.getTime())
    const displayEndMs   = entry.endTime ? Math.min(rawEndMs, dayEnd.getTime()) : null

    // Skip entries that don't fall within this day at all
    if (displayStartMs > dayEnd.getTime()) continue
    if (displayEndMs !== null && displayEndMs <= dayStart.getTime()) continue

    const displayStartMin = minOfDay(new Date(displayStartMs))
    const displayEndMin   = displayEndMs !== null ? minOfDay(new Date(displayEndMs)) : null

    const rawEndMin = displayEndMin ?? minOfDay(now)
    const durMin = Math.max(rawEndMin >= displayStartMin ? rawEndMin - displayStartMin : 0, 1)

    const { height, isCompressed } = getCardHeight(entry, durMin)

    items.push({
      entry,
      top: displayStartMin * PX_PER_MIN,  // ← time-accurate, never shifted
      height,
      isCompressed,
      durationMin: durMin,
      displayStartMin,
      displayEndMin,
      lane: 0,
      laneCount: 1,
    })
  }

  // Assign horizontal lanes for visually overlapping pairs.
  // Two cards overlap when the later one's top < the earlier one's top + height.
  // We cap at 2 lanes; a third simultaneous event falls into lane 1 (rare in practice).
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].top >= items[i].top + items[i].height) break  // sorted → done
      items[i].lane = 0;  items[i].laneCount = 2
      items[j].lane = 1;  items[j].laneCount = 2
    }
  }

  return items
}

// ── EntryCard ─────────────────────────────────────────────────────────────────
const EntryCard = memo(function EntryCard({
  item, isTogether, onEdit, onDelete,
}: {
  item: LayoutItem
  isTogether: boolean
  onEdit?: (e: StatusEntry) => void
  onDelete?: (id: string) => void
}) {
  const { entry, top, height, isCompressed, durationMin, lane, laneCount } = item
  const isActive = !entry.endTime

  // Lane 0 = full width (no overlap) or left ~65% (overlap)
  // Lane 1 = right ~65% (shifted right)
  const laneStyle: React.CSSProperties = laneCount === 1
    ? { left: 2, right: 2 }
    : lane === 0
      ? { left: 2, right: '36%' }
      : { left: '36%', right: 2 }

  return (
    <div
      className={`group absolute rounded-xl overflow-hidden transition-shadow duration-150 ${
        isTogether
          ? 'ring-2 ring-green-300 shadow-[0_0_10px_rgba(134,239,172,0.55)]'
          : 'border border-white/50 shadow-sm hover:shadow-md'
      }`}
      style={{ top, height, backgroundColor: entry.color, ...laneStyle }}
    >
      {(onEdit || onDelete) && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/90 rounded-lg px-1 py-0.5 shadow z-10">
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(entry) }}
              className="p-0.5 rounded hover:bg-violet-100 text-violet-400">
              <Pencil size={9} />
            </button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-0.5 rounded hover:bg-red-100 text-red-400">
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}

      {isActive && (
        <span className="absolute top-1 right-4 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-10" />
      )}

      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] leading-none flex-shrink-0">{entry.emoji}</span>
          <span className="font-bold text-[10px] text-gray-700 truncate flex-1 leading-tight">
            {entry.status}{isCompressed && isSleepStatus(entry.status) ? ' 😴' : ''}
          </span>
          {isCompressed && (
            <span className="text-[9px] text-gray-400 font-medium flex-shrink-0">{fmtDuration(durationMin)}</span>
          )}
        </div>

        {!isCompressed && (
          <>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-tight whitespace-nowrap">
              {formatTime(entry.startTime)}
              {isActive ? ' → Now' : entry.endTime ? ` – ${formatTime(entry.endTime)}` : ''}
            </p>
            {entry.note && (
              <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-2 leading-snug break-words">
                {entry.note}
              </p>
            )}
            {isTogether && (
              <span className="text-[8px] text-green-700 font-bold mt-auto pt-0.5">💚 Together</span>
            )}
          </>
        )}
      </div>
    </div>
  )
})

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SplitTimeline({ entries, date, onEdit, onDelete, onPrevDay, onNextDay }: Props) {
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dateLabel = useMemo(() => formatDate(parseISO(date)), [date])
  const todayStr  = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const { jEntries, aEntries } = useMemo(() => ({
    jEntries: entries.filter(e => e.userId === 'jeanette'),
    aEntries: entries.filter(e => e.userId === 'anthony'),
  }), [entries])

  const jLayout = useMemo(() => layoutColumn(jEntries, date, now), [jEntries, date, now])
  const aLayout = useMemo(() => layoutColumn(aEntries, date, now), [aEntries, date, now])

  // Together glow set + bridge chip positions
  const { togetherIds, bridges } = useMemo(() => {
    const togetherIds = new Set<string>()
    const bridges: { y: number }[] = []
    for (const j of jLayout) {
      if (!j.entry.isShared) continue
      const jS = new Date(j.entry.startTime).getTime()
      const jE = (j.entry.endTime ? new Date(j.entry.endTime) : now).getTime()
      for (const a of aLayout) {
        if (!a.entry.isShared) continue
        const aS = new Date(a.entry.startTime).getTime()
        const aE = (a.entry.endTime ? new Date(a.entry.endTime) : now).getTime()
        if (Math.max(jS, aS) >= Math.min(jE, aE)) continue
        togetherIds.add(j.entry.id)
        togetherIds.add(a.entry.id)
        // Bridge y = midpoint of where the shared time range sits on the ruler
        const overlapMidMin = (
          Math.max(j.displayStartMin, a.displayStartMin) +
          Math.min(
            j.displayEndMin ?? minOfDay(now),
            a.displayEndMin ?? minOfDay(now)
          )
        ) / 2
        bridges.push({ y: overlapMidMin * PX_PER_MIN })
      }
    }
    return { togetherIds, bridges }
  }, [jLayout, aLayout, now])

  // Auto-scroll: today → current time; past/future → first entry or 8 AM
  useEffect(() => {
    if (!scrollRef.current) return
    let scrollTo: number
    if (date === todayStr) {
      scrollTo = Math.max(0, minOfDay(new Date()) * PX_PER_MIN - 100)
    } else {
      const allTops = [...jLayout, ...aLayout].map(l => l.top)
      scrollTo = allTops.length > 0
        ? Math.max(0, Math.min(...allTops) - 40)
        : 8 * 60 * PX_PER_MIN   // 8 AM default
    }
    scrollRef.current.scrollTop = scrollTo
  }, [date, todayStr])   // intentionally omit layout deps — only scroll on date change

  const nowLineY = minOfDay(now) * PX_PER_MIN

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
          {(onPrevDay || onNextDay) && (
            <div className="flex gap-0.5">
              <button onClick={onPrevDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button onClick={onNextDay} disabled={!onNextDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
          {/* Column headers — equal 1fr widths via CSS grid */}
          <div
            className="flex-shrink-0 border-b border-gray-100"
            style={{ display: 'grid', gridTemplateColumns: `${TIME_AXIS_W}px 1fr 12px 1fr` }}
          >
            <div />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: '#ede9fe' }}>
              <span className="text-sm">🐧</span>
              <span className="font-bold text-[11px] text-violet-700">Jeanette</span>
            </div>
            <div className="bg-white" />
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: '#fef9c3' }}>
              <span className="text-sm">🦕</span>
              <span className="font-bold text-[11px] text-amber-700">Anthony</span>
            </div>
          </div>

          {/* Scrollable full-day grid — always 12 AM → 11:59 PM */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            <div
              className="relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `${TIME_AXIS_W}px 1fr 12px 1fr`,
                height: TOTAL_H,
              }}
            >
              {/* Time axis */}
              <div className="relative border-r border-gray-100/60">
                {HOUR_MARKS.map(h => (
                  <div key={h} className="absolute right-1.5"
                    style={{ top: h * 60 * PX_PER_MIN - 5 }}>
                    <span className="text-[8px] text-gray-400 font-medium whitespace-nowrap">
                      {hourLabel(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Jeanette column */}
              <div className="relative">
                {HOUR_MARKS.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none"
                    style={{ top: h * 60 * PX_PER_MIN }} />
                ))}
                {/* Current-time line */}
                {date === todayStr && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/50 pointer-events-none z-20"
                    style={{ top: nowLineY }}>
                    <div className="absolute -top-1 -left-0.5 w-2 h-2 bg-red-400/60 rounded-full" />
                  </div>
                )}
                {jLayout.map(item => (
                  <EntryCard key={item.entry.id} item={item}
                    isTogether={togetherIds.has(item.entry.id)} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>

              {/* Centre connector column */}
              <div className="relative border-x border-gray-100/30">
                {bridges.map((b, i) => (
                  <div key={i}
                    className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ top: b.y - 7, height: 14 }}>
                    <span className="text-[10px] leading-none">💚</span>
                  </div>
                ))}
              </div>

              {/* Anthony column */}
              <div className="relative">
                {HOUR_MARKS.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none"
                    style={{ top: h * 60 * PX_PER_MIN }} />
                ))}
                {date === todayStr && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/50 pointer-events-none z-20"
                    style={{ top: nowLineY }} />
                )}
                {aLayout.map(item => (
                  <EntryCard key={item.entry.id} item={item}
                    isTogether={togetherIds.has(item.entry.id)} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
