'use client'

import { useMemo, memo, useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { formatTime, formatDate } from '@/lib/utils'
import { parseISO } from 'date-fns'

// ── Constants ─────────────────────────────────────────────────────────────────
const PX_PER_MIN  = 0.55              // 33 px/hr; full day ≈ 792 px
const TOTAL_H     = 1440 * PX_PER_MIN // 792 px — always the full day
const TIME_AXIS_W = 32                // px for the left time-label column

// Card heights — readable, NOT proportional to duration
const CARD_H      = 56   // standard card height
const CARD_NOTE_H = 14   // added per note line (up to 2)
const CARD_H_MAX  = 82   // cap including notes
const CARD_H_LONG = 38   // compressed card for long events (≥ 3 h)
const LONG_MIN    = 180  // minutes threshold for compression

// Hour ticks every 2 h: 12a 2a 4a … 10p
const HOUR_MARKS = Array.from({ length: 12 }, (_, i) => i * 2)

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

// LayoutItem has NO lane/laneCount — positioning is purely time-based.
type LayoutItem = {
  entry: StatusEntry
  top: number           // displayStartMin * PX_PER_MIN — never shifted
  height: number        // readable fixed height, not proportional to duration
  isCompressed: boolean // true when duration > LONG_MIN
  durationMin: number   // visible duration on this day (for the text label)
  zIndex: number        // later-starting entries sit on top when visually overlapping
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
function minOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function hourLabel(h: number): string {
  if (h === 0)  return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

// ── Layout ────────────────────────────────────────────────────────────────────
// Pure function — no collision avoidance, no lane splitting, no shifting.
// Each card's top = minutesSinceLocalMidnight * PX_PER_MIN, full stop.
function layoutColumn(entries: StatusEntry[], viewDate: string, now: Date): LayoutItem[] {
  const dayStart = new Date(viewDate + 'T00:00:00')
  const dayEnd   = new Date(viewDate + 'T23:59:59.999')
  const isToday  = viewDate === now.toISOString().slice(0, 10)

  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const items: LayoutItem[] = []

  for (let i = 0; i < sorted.length; i++) {
    const entry      = sorted[i]
    const rawStartMs = new Date(entry.startTime).getTime()
    const rawEndMs   = entry.endTime ? new Date(entry.endTime).getTime() : null

    // Clamp to this local day — handles cross-midnight entries:
    //   previous day shows 11:51 PM → 12:00 AM (clipped to dayEnd)
    //   next day shows 12:00 AM → 7:44 AM (clipped from dayStart)
    const displayStartMs = Math.max(rawStartMs, dayStart.getTime())
    const displayEndMs   = rawEndMs !== null
      ? Math.min(rawEndMs, dayEnd.getTime())
      : isToday
        ? null               // ongoing today → no fixed end, show as live
        : dayEnd.getTime()   // ongoing on a past day → clip to midnight

    // Completely outside this day — skip
    if (displayStartMs >= dayEnd.getTime()) continue
    if (displayEndMs !== null && displayEndMs <= dayStart.getTime()) continue

    const displayStartMin = minOfDay(new Date(displayStartMs))

    // Duration uses ms arithmetic — avoids minOfDay subtraction wrapping at midnight
    const endMs      = displayEndMs ?? now.getTime()
    const durationMin = Math.max(Math.round((endMs - displayStartMs) / 60_000), 1)

    const isCompressed = durationMin > LONG_MIN
    const noteLines    = (!isCompressed && entry.note)
      ? Math.min(Math.ceil(entry.note.length / 28), 2)
      : 0
    const height = isCompressed
      ? CARD_H_LONG
      : Math.min(CARD_H + noteLines * CARD_NOTE_H, CARD_H_MAX)

    items.push({
      entry,
      top: displayStartMin * PX_PER_MIN,
      height,
      isCompressed,
      durationMin,
      zIndex: i + 1,   // later entries render on top when visually overlapping
    })
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
  const { entry, top, height, isCompressed, durationMin, zIndex } = item
  const isActive = !entry.endTime

  return (
    <div
      className="group absolute rounded-xl overflow-hidden border border-white/50 shadow-sm hover:shadow-md transition-shadow duration-150"
      style={{
        top,
        height,
        left: 2,
        right: 2,
        zIndex,
        backgroundColor: entry.color,
      }}
    >
      {/* Shared glow — purely decorative, no layout impact */}
      {isTogether && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{ boxShadow: '0 0 0 2px #86efac, 0 0 10px rgba(134,239,172,0.55)' }}
        />
      )}

      {/* Edit / Delete */}
      {(onEdit || onDelete) && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/90 rounded-lg px-1 py-0.5 shadow z-20">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(entry) }}
              className="p-0.5 rounded hover:bg-violet-100 text-violet-400"
            >
              <Pencil size={9} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-0.5 rounded hover:bg-red-100 text-red-400"
            >
              <Trash2 size={9} />
            </button>
          )}
        </div>
      )}

      {/* Live pulse dot */}
      {isActive && (
        <span className="absolute top-1 right-4 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-10" />
      )}

      {/* Card content */}
      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
        {/* Row 1 — emoji, status name, duration */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] leading-none flex-shrink-0">{entry.emoji}</span>
          <span className="font-bold text-[10px] text-gray-700 truncate flex-1 leading-tight">
            {entry.status}
          </span>
          <span className="text-[9px] text-gray-400 font-medium flex-shrink-0 ml-0.5">
            {fmtDur(durationMin)}
          </span>
        </div>

        {/* Row 2+ — only on standard (non-compressed) cards */}
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

// ── Main component ────────────────────────────────────────────────────────────
export default function SplitTimeline({
  entries, date, onEdit, onDelete, onPrevDay, onNextDay,
}: Props) {
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Tick every minute so the "now" line and live durations stay current
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const todayStr  = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const dateLabel = useMemo(() => formatDate(parseISO(date)), [date])

  // Split entries by user once; don't re-split on every now-tick unless entries change
  const { jEntries, aEntries } = useMemo(() => ({
    jEntries: entries.filter(e => e.userId === 'jeanette'),
    aEntries: entries.filter(e => e.userId === 'anthony'),
  }), [entries])

  // Layout is recomputed when entries, date, or now changes.
  // For past days, 'now' doesn't affect layout (no ongoing entries),
  // so the cost of the 60s re-render is minimal.
  const jLayout = useMemo(() => layoutColumn(jEntries, date, now), [jEntries, date, now])
  const aLayout = useMemo(() => layoutColumn(aEntries, date, now), [aEntries, date, now])

  // Find shared-event pairs for the glow decoration + bridge emoji.
  // This is VISUAL ONLY — it never touches top/height/left/right of any card.
  const { togetherIds, bridges } = useMemo(() => {
    const togetherIds = new Set<string>()
    const bridges: { y: number }[] = []

    for (const j of jLayout) {
      if (!j.entry.isShared) continue
      const jS = new Date(j.entry.startTime).getTime()
      const jE = j.entry.endTime ? new Date(j.entry.endTime).getTime() : now.getTime()

      for (const a of aLayout) {
        if (!a.entry.isShared) continue
        const aS = new Date(a.entry.startTime).getTime()
        const aE = a.entry.endTime ? new Date(a.entry.endTime).getTime() : now.getTime()

        if (jS >= aE || aS >= jE) continue  // no time overlap

        togetherIds.add(j.entry.id)
        togetherIds.add(a.entry.id)

        // Bridge y = average of the two cards' top positions on this timeline
        bridges.push({ y: (j.top + a.top) / 2 })
      }
    }

    return { togetherIds, bridges }
  }, [jLayout, aLayout, now])

  // Scroll to current time (today) or first entry (past days) on date change only
  useEffect(() => {
    if (!scrollRef.current) return
    let target: number
    if (date === todayStr) {
      target = Math.max(0, minOfDay(new Date()) * PX_PER_MIN - 100)
    } else {
      const allTops = [...jLayout, ...aLayout].map(l => l.top)
      target = allTops.length > 0
        ? Math.max(0, Math.min(...allTops) - 40)
        : 8 * 60 * PX_PER_MIN  // default to 8 AM if no entries
    }
    scrollRef.current.scrollTop = target
  }, [date, todayStr])  // intentionally excludes layout — only re-scroll on date change

  const nowLineY = minOfDay(now) * PX_PER_MIN

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
          {(onPrevDay || onNextDay) && (
            <div className="flex gap-0.5">
              <button
                onClick={onPrevDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={onNextDay}
                disabled={!onNextDay}
                className="p-1.5 rounded-full hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
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
                  <div
                    key={h}
                    className="absolute right-1.5"
                    style={{ top: h * 60 * PX_PER_MIN - 5 }}
                  >
                    <span className="text-[8px] text-gray-400 font-medium whitespace-nowrap">
                      {hourLabel(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Jeanette column */}
              <div className="relative">
                {HOUR_MARKS.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none"
                    style={{ top: h * 60 * PX_PER_MIN }}
                  />
                ))}
                {date === todayStr && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-400/50 pointer-events-none z-30"
                    style={{ top: nowLineY }}
                  >
                    <div className="absolute -top-1 -left-0.5 w-2 h-2 bg-red-400/60 rounded-full" />
                  </div>
                )}
                {jLayout.map(item => (
                  <EntryCard
                    key={item.entry.id}
                    item={item}
                    isTogether={togetherIds.has(item.entry.id)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>

              {/* Centre connector — bridge emoji for shared events */}
              <div className="relative border-x border-gray-100/30">
                {bridges.map((b, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-10"
                    style={{ top: b.y - 7, height: 14 }}
                  >
                    <span className="text-[10px] leading-none">💚</span>
                  </div>
                ))}
              </div>

              {/* Anthony column */}
              <div className="relative">
                {HOUR_MARKS.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100/40 pointer-events-none"
                    style={{ top: h * 60 * PX_PER_MIN }}
                  />
                ))}
                {date === todayStr && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-400/50 pointer-events-none z-30"
                    style={{ top: nowLineY }}
                  />
                )}
                {aLayout.map(item => (
                  <EntryCard
                    key={item.entry.id}
                    item={item}
                    isTogether={togetherIds.has(item.entry.id)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
