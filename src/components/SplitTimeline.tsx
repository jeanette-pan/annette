'use client'

import { useMemo, memo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { formatTime, formatDate, isSleepStatus } from '@/lib/utils'
import { parseISO } from 'date-fns'

// ── Constants ─────────────────────────────────────────────────────────────────
const TIME_AXIS_W = 32   // px
const CARD_GAP = 6       // min gap between cards in same column
const CARD_MIN_H = 68
const CARD_MAX_H = 112
const NOTE_LINE_H = 13
const LONG_MIN = 180     // ≥ 3h → compressed card
const COMPRESSED_H = 50

// Time-axis compression scales (px per minute)
const SCALE_BOTH = 0.9   // both columns have entries
const SCALE_ONE  = 0.28  // only one column has entries (e.g. solo sleep)
const SCALE_NONE = 0.07  // neither column has entries (dead gap)
const MIN_SEG_PX = 8     // minimum rendered height per segment

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
  top: number
  height: number
  isCompressed: boolean
  durationMin: number
  displayStart: Date    // clipped to day boundary
  displayEnd: Date | null
}

type Segment = { startMin: number; endMin: number; startY: number; pxPerMin: number }

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
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function cardHeight(entry: StatusEntry, durMin: number): { height: number; isCompressed: boolean } {
  if (durMin > LONG_MIN) return { height: COMPRESSED_H, isCompressed: true }
  const noteLines = entry.note ? Math.min(Math.ceil(entry.note.length / 26), 3) : 0
  return { height: Math.min(CARD_MIN_H + noteLines * NOTE_LINE_H, CARD_MAX_H), isCompressed: false }
}

// Build time segments, compressing dead zones and solo-active zones.
function buildTimeAxis(
  jEntries: StatusEntry[],
  aEntries: StatusEntry[],
  vsm: number,
  vem: number,
  now: Date,
): { timeToY: (min: number) => number; totalH: number; hourMarkers: { hour: number; y: number }[] } {
  // Collect [startMin, endMin] for each column
  function entryRange(e: StatusEntry): [number, number] {
    const s = minOfDay(new Date(e.startTime))
    const rawE = e.endTime ? minOfDay(new Date(e.endTime)) : minOfDay(now)
    const end = rawE >= s ? rawE : s + 30
    return [s, end]
  }

  // Build event list for sweep-line
  type Evt = { min: number; delta: 1 | -1; col: 0 | 1 }
  const events: Evt[] = []
  for (const e of jEntries) {
    const [s, en] = entryRange(e)
    events.push({ min: Math.max(vsm, s), delta: 1, col: 0 })
    events.push({ min: Math.min(vem, en), delta: -1, col: 0 })
  }
  for (const e of aEntries) {
    const [s, en] = entryRange(e)
    events.push({ min: Math.max(vsm, s), delta: 1, col: 1 })
    events.push({ min: Math.min(vem, en), delta: -1, col: 1 })
  }
  events.sort((a, b) => a.min - b.min || a.delta - b.delta)

  // Sweep to build segments with coverage type
  const segments: Segment[] = []
  let jCount = 0, aCount = 0, prevMin = vsm, currentY = 0
  let ei = 0

  function flushSegment(toMin: number) {
    if (toMin <= prevMin) return
    const type = (jCount > 0 && aCount > 0) ? 'both' : (jCount > 0 || aCount > 0) ? 'one' : 'none'
    const scale = type === 'both' ? SCALE_BOTH : type === 'one' ? SCALE_ONE : SCALE_NONE
    const dur = toMin - prevMin
    const px = Math.max(dur * scale, MIN_SEG_PX)
    segments.push({ startMin: prevMin, endMin: toMin, startY: currentY, pxPerMin: px / dur })
    currentY += px
    prevMin = toMin
  }

  while (ei < events.length) {
    const evMin = events[ei].min
    flushSegment(evMin)
    while (ei < events.length && events[ei].min === evMin) {
      const ev = events[ei++]
      if (ev.col === 0) jCount += ev.delta; else aCount += ev.delta
    }
  }
  flushSegment(vem)

  function timeToY(min: number): number {
    const clamped = Math.max(vsm, Math.min(vem, min))
    for (const seg of segments) {
      if (clamped <= seg.endMin) {
        return seg.startY + (clamped - seg.startMin) * seg.pxPerMin
      }
    }
    return currentY
  }

  // Hour markers
  const seenHours = new Set<number>()
  const hourMarkers: { hour: number; y: number }[] = []
  for (const seg of segments) {
    const h0 = Math.ceil(seg.startMin / 60)
    const h1 = Math.floor(seg.endMin / 60)
    for (let h = h0; h <= h1; h++) {
      if (!seenHours.has(h) && h >= vsm / 60 && h <= vem / 60) {
        seenHours.add(h)
        hourMarkers.push({ hour: h, y: timeToY(h * 60) })
      }
    }
  }

  return { timeToY, totalH: currentY, hourMarkers }
}

// Layout one column: soft time alignment + push-down collision avoidance.
function layoutColumn(
  entries: StatusEntry[],
  timeToY: (min: number) => number,
  now: Date,
  dayStart: Date,
  dayEnd: Date,
): LayoutItem[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )
  const result: LayoutItem[] = []
  let prevBottom = 0

  for (const entry of sorted) {
    const rawStart = new Date(entry.startTime)
    const rawEnd = entry.endTime ? new Date(entry.endTime) : now

    // Clip to the viewed day's local boundaries
    const displayStart = rawStart < dayStart ? dayStart : rawStart
    const displayEndRaw = rawEnd > dayEnd ? dayEnd : rawEnd
    const displayEnd = entry.endTime ? displayEndRaw : null  // preserve null = active

    const startMin = minOfDay(displayStart)
    const endMin = minOfDay(displayEnd ?? now)
    const durMin = Math.max(endMin >= startMin ? endMin - startMin : 0, 1)

    const { height, isCompressed } = cardHeight(entry, durMin)
    const idealTop = timeToY(startMin)
    const top = Math.max(idealTop, prevBottom + (result.length > 0 ? CARD_GAP : 0))

    result.push({ entry, top, height, isCompressed, durationMin: durMin, displayStart, displayEnd })
    prevBottom = top + height
  }
  return result
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
  const { entry, top, height, isCompressed, durationMin, displayStart, displayEnd } = item
  const isActive = !entry.endTime

  return (
    <div
      className={`group absolute left-1 right-1 rounded-xl overflow-hidden transition-shadow duration-150 ${
        isTogether
          ? 'ring-2 ring-green-300 shadow-[0_0_10px_rgba(134,239,172,0.55)]'
          : 'border border-white/50 shadow-sm hover:shadow-md'
      }`}
      style={{ top, height, backgroundColor: entry.color }}
    >
      {/* Hover actions */}
      {(onEdit || onDelete) && (
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5 bg-white/90 rounded-lg px-1 py-0.5 shadow z-10">
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
        <span className="absolute top-1.5 right-5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-10" />
      )}

      <div className="px-2 py-1.5 h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-none flex-shrink-0">{entry.emoji}</span>
          <span className="font-bold text-[11px] text-gray-700 truncate flex-1">
            {entry.status}{isCompressed && isSleepStatus(entry.status) ? ' 😴' : ''}
          </span>
          {isCompressed && (
            <span className="text-[9px] text-gray-400 font-medium flex-shrink-0 ml-0.5">{fmtDuration(durationMin)}</span>
          )}
        </div>

        {!isCompressed && (
          <>
            <p className="text-[9px] text-gray-500 mt-0.5 leading-tight whitespace-nowrap">
              {formatTime(displayStart)}
              {isActive ? ' → Now' : displayEnd ? ` – ${formatTime(displayEnd)}` : ''}
            </p>
            {entry.note && (
              <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-3 leading-snug break-words">
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
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dateLabel = useMemo(() => formatDate(parseISO(date)), [date])
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Local day boundaries for cross-midnight clipping
  const { dayStart, dayEnd } = useMemo(() => ({
    dayStart: new Date(date + 'T00:00:00'),
    dayEnd: new Date(date + 'T23:59:59.999'),
  }), [date])

  const { jEntries, aEntries } = useMemo(() => ({
    jEntries: entries.filter(e => e.userId === 'jeanette'),
    aEntries: entries.filter(e => e.userId === 'anthony'),
  }), [entries])

  // View range based on effective display times (clipped to this day)
  const { vsm, vem } = useMemo(() => {
    if (entries.length === 0) return { vsm: 480, vem: 1320 }
    const allMins: number[] = []
    for (const e of entries) {
      const rawS = new Date(e.startTime)
      const rawE = e.endTime ? new Date(e.endTime) : now
      const s = minOfDay(rawS < dayStart ? dayStart : rawS)
      const eMin = minOfDay(rawE > dayEnd ? dayEnd : rawE)
      allMins.push(s, eMin >= s ? eMin : s + 30)
    }
    const lo = Math.floor(Math.max(0, Math.min(...allMins) - 60) / 60) * 60
    const hi = Math.min(Math.ceil((Math.max(...allMins) + 60) / 60) * 60, 1440)
    return { vsm: lo, vem: hi }
  }, [entries, dayStart, dayEnd, now])

  const { timeToY, totalH, hourMarkers } = useMemo(
    () => buildTimeAxis(jEntries, aEntries, vsm, vem, now),
    [jEntries, aEntries, vsm, vem, now]
  )

  const jLayout = useMemo(
    () => layoutColumn(jEntries, timeToY, now, dayStart, dayEnd),
    [jEntries, timeToY, now, dayStart, dayEnd]
  )
  const aLayout = useMemo(
    () => layoutColumn(aEntries, timeToY, now, dayStart, dayEnd),
    [aEntries, timeToY, now, dayStart, dayEnd]
  )

  // Together highlights + bridge chips
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
        bridges.push({ y: (j.top + j.height / 2 + a.top + a.height / 2) / 2 })
      }
    }
    return { togetherIds, bridges }
  }, [jLayout, aLayout, now])

  const colTotalH = useMemo(() => {
    const jBot = jLayout.at(-1) ? jLayout.at(-1)!.top + jLayout.at(-1)!.height : 0
    const aBot = aLayout.at(-1) ? aLayout.at(-1)!.top + aLayout.at(-1)!.height : 0
    return Math.max(jBot, aBot, totalH) + 24
  }, [jLayout, aLayout, totalH])

  const showNowLine = date === todayStr && minOfDay(now) >= vsm && minOfDay(now) <= vem
  const nowLineY = timeToY(minOfDay(now))

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
          {/* Column headers — equal widths via CSS grid */}
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

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* CSS grid keeps both content columns exactly equal (1fr each) */}
            <div
              className="relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `${TIME_AXIS_W}px 1fr 12px 1fr`,
                height: colTotalH,
              }}
            >
              {/* Time axis */}
              <div className="relative border-r border-gray-100/60">
                {hourMarkers.map(({ hour, y }) => (
                  <div key={hour} className="absolute right-1.5" style={{ top: y - 5 }}>
                    <span className="text-[8px] text-gray-400 font-medium whitespace-nowrap">{hourLabel(hour)}</span>
                  </div>
                ))}
              </div>

              {/* Jeanette column */}
              <div className="relative">
                {/* Hour grid lines */}
                {hourMarkers.map(({ hour, y }) => (
                  <div key={hour} className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none" style={{ top: y }} />
                ))}
                {showNowLine && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/40 pointer-events-none z-20" style={{ top: nowLineY }} />
                )}
                {jLayout.map(item => (
                  <EntryCard key={item.entry.id} item={item}
                    isTogether={togetherIds.has(item.entry.id)} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>

              {/* Centre connector column */}
              <div className="relative border-x border-gray-100/30">
                {bridges.map((b, i) => (
                  <div key={i} className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ top: b.y - 7, height: 14 }}>
                    <span className="text-[10px] leading-none">💚</span>
                  </div>
                ))}
              </div>

              {/* Anthony column */}
              <div className="relative">
                {hourMarkers.map(({ hour, y }) => (
                  <div key={hour} className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none" style={{ top: y }} />
                ))}
                {showNowLine && (
                  <div className="absolute left-0 right-0 border-t-2 border-red-400/40 pointer-events-none z-20" style={{ top: nowLineY }} />
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
