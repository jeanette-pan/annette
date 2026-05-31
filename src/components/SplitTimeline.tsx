'use client'

import { useEffect, useState, useMemo, memo } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime, formatDate, isSleepStatus } from '@/lib/utils'
import { parseISO } from 'date-fns'
import { getEventEmotionSegments, getEmotionAtTime, buildAccentLineGradient, type EmotionData, type EmotionSegment } from '@/lib/emotionConfig'

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
  jEmotions?: EmotionData[]
  aEmotions?: EmotionData[]
  onEdit?: (entry: StatusEntry) => void
  onDelete?: (entryId: string) => void
  onPrevDay?: () => void
  onNextDay?: () => void
}

const PX_PER_MIN = 1.5 // 90px per hour

function minOfDay(d: Date) { return d.getHours() * 60 + d.getMinutes() }

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hourLabel(h: number) {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function fmtMs(ms: number) {
  const m = Math.floor(ms / 60000)
  return Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

const EntryBlock = memo(function EntryBlock({
  entry, top, height, isTogether, emotionsAlign, emotionSegments, railSide, onEdit, onDelete,
}: {
  entry: StatusEntry
  top: number
  height: number
  isTogether: boolean
  emotionsAlign?: boolean
  emotionSegments?: EmotionSegment[]
  railSide?: 'left' | 'right'
  onEdit?: (e: StatusEntry) => void
  onDelete?: (id: string) => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  const px = Math.max(height, 26)
  const isCompact = height < 52
  const isActive = !entry.endTime

  const timeStr = isActive
    ? `${formatTime(entry.startTime)} → Now`
    : entry.endTime
      ? `${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`
      : formatTime(entry.startTime)

  const durMs = Math.max(
    (entry.endTime ? new Date(entry.endTime).getTime() : Date.now()) - new Date(entry.startTime).getTime(),
    0
  )
  const detailLine = `${timeStr} · ${fmtMs(durMs)}`

  const nonNullSegs = emotionSegments?.filter(s => s.emotion !== null) ?? []
  const hasEmotion = nonNullSegs.length > 0
  const uniqueIds = new Set(nonNullSegs.map(s => s.emotion!.id))
  const isMultiEmotion = uniqueIds.size > 1
  const primaryEmotion = nonNullSegs[0]?.emotion ?? null

  // Together glow: soft multi-layer, no harsh border; emotionally aligned moments glow warmer
  let boxShadow: string | undefined
  if (isTogether && emotionsAlign) {
    boxShadow = '0 0 10px rgba(134,239,172,0.65), 0 0 22px rgba(134,239,172,0.42), 0 0 40px rgba(134,239,172,0.22)'
  } else if (isTogether) {
    boxShadow = '0 0 8px rgba(134,239,172,0.55), 0 0 18px rgba(134,239,172,0.30), 0 0 32px rgba(134,239,172,0.14)'
  }

  // All cards share the same neutral border — together state uses glow, not a border
  const borderClass = 'border border-white/70 shadow-sm'

  // Thin accent line: right side for Jeanette, left side for Anthony
  const accentLineStyle: React.CSSProperties | null = !hasEmotion ? null : {
    background: isMultiEmotion
      ? buildAccentLineGradient(emotionSegments!)
      : primaryEmotion!.circleColor,
  }
  const accentSide = railSide === 'right' ? 'right-0' : 'left-0'
  const contentPad = railSide === 'right' ? 'pl-1.5 pr-3' : 'pl-3 pr-1.5'

  if (isCompact) {
    return (
      <div
        tabIndex={0}
        className={`absolute left-0.5 right-0.5 rounded-xl overflow-hidden cursor-default select-none outline-none ${borderClass}`}
        style={{ top, height: px, backgroundColor: entry.color, zIndex: 5, boxShadow }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        onClick={(e) => { e.stopPropagation(); setShowDetails(prev => !prev) }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowDetails(false) }}
      >
        {/* Emotion accent line — thin strip on the configured edge */}
        {accentLineStyle && (
          <div className={`absolute top-0 bottom-0 pointer-events-none z-10 ${accentSide}`} style={{ width: 5, ...accentLineStyle }} />
        )}
        {isActive && (
          <span className="absolute top-1 right-1.5 w-1 h-1 bg-green-400 rounded-full border border-white animate-pulse z-20" />
        )}

        {showDetails && (onEdit || onDelete) && (
          <div className="absolute top-0.5 right-0.5 flex gap-0.5 bg-white/95 rounded-lg px-1 py-0.5 shadow z-30">
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

        <div className={`${contentPad} h-full flex items-center overflow-hidden`}>
          {!showDetails ? (
            <div className="flex items-center gap-0.5 min-w-0 w-full">
              <span className="text-[11px] leading-none flex-shrink-0">{entry.emoji}</span>
              <span className="font-bold text-[9px] text-gray-700 truncate leading-tight">{entry.status}</span>
            </div>
          ) : (
            <span className="text-[9px] text-gray-600 font-medium truncate leading-tight w-full">{detailLine}</span>
          )}
        </div>
      </div>
    )
  }

  // Normal card: always shows title + time row; edit/delete appear on hover.
  return (
    <div
      className={`group absolute left-0.5 right-0.5 rounded-xl overflow-hidden ${borderClass}`}
      style={{ top, height: px, backgroundColor: entry.color, zIndex: 2, boxShadow }}
    >
      {/* Emotion accent line — thin strip on the configured edge */}
      {accentLineStyle && (
        <div className={`absolute top-0 bottom-0 pointer-events-none z-10 ${accentSide}`} style={{ width: 5, ...accentLineStyle }} />
      )}
      {isActive && (
        <span className="absolute top-1.5 right-5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white animate-pulse z-20" />
      )}

      {(onEdit || onDelete) && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 bg-white/95 rounded-lg px-1 py-0.5 shadow z-30">
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

      <div className={`${contentPad} py-1 h-full flex flex-col overflow-hidden`}>
        <div className="flex items-center gap-0.5 min-w-0">
          <span className="text-xs leading-none flex-shrink-0">{entry.emoji}</span>
          <span className="font-bold text-[10px] text-gray-700 truncate leading-tight">
            {entry.status}{isSleepStatus(entry.status) ? ' 😴' : ''}
          </span>
        </div>
        <p className="text-[9px] text-gray-500 mt-0.5 leading-tight whitespace-nowrap">{timeStr}</p>
        {isTogether && (
          <span className="text-[9px] mt-0.5 leading-tight select-none">🐧 💚 🦕</span>
        )}
        {entry.note && (
          <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-4 break-words leading-snug">{entry.note}</p>
        )}
      </div>
    </div>
  )
})

export default function SplitTimeline({ entries, date, jEmotions = [], aEmotions = [], onEdit, onDelete, onPrevDay, onNextDay }: Props) {
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

  // View window: snap to hour boundaries with 30-min padding around actual entries.
  // Cross-day entries (started previous local day) are clipped to start at 0 (midnight).
  const { vsm, vem, totalH, hours } = useMemo(() => {
    if (entries.length === 0) {
      const hours = Array.from({ length: 15 }, (_, i) => i + 8)
      return { vsm: 480, vem: 1320, totalH: 840 * PX_PER_MIN, hours }
    }
    const mins = entries.flatMap(e => {
      const isCrossDay = e.date !== date
      const s = isCrossDay ? 0 : minOfDay(new Date(e.startTime))
      let endMin: number
      if (!e.endTime) {
        endMin = minOfDay(now)
      } else {
        const endD = new Date(e.endTime)
        const endLocal = localDateStr(endD)
        if (isCrossDay) {
          if (endLocal > date) { endMin = 1440 }
          else if (endLocal === date) {
            const rawE = minOfDay(endD)
            if (rawE === 0) return []
            endMin = rawE
          } else return []
        } else {
          endMin = endLocal > date ? 1440 : Math.max(minOfDay(endD), s)
        }
      }
      return [s, endMin]
    })
    if (mins.length === 0) {
      const hours = Array.from({ length: 15 }, (_, i) => i + 8)
      return { vsm: 480, vem: 1320, totalH: 840 * PX_PER_MIN, hours }
    }
    const lo = Math.floor(Math.max(0, Math.min(...mins) - 30) / 60) * 60
    const hi = Math.min(Math.ceil((Math.max(...mins) + 30) / 60) * 60, 1440)
    const hours: number[] = []
    for (let h = lo / 60; h <= hi / 60; h++) hours.push(h)
    return { vsm: lo, vem: hi, totalH: (hi - lo) * PX_PER_MIN, hours }
  }, [entries, now, date])

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

  // Pre-compute emotion segments per entry so renderCol passes stable array references
  // to memo()'d EntryBlock — avoids recomputing on every render
  const jEmotionSegs = useMemo(() => {
    const m = new Map<string, EmotionSegment[]>()
    for (const entry of jEntries) {
      const end = entry.endTime ? new Date(entry.endTime) : now
      m.set(entry.id, getEventEmotionSegments(jEmotions, new Date(entry.startTime), end))
    }
    return m
  }, [jEntries, jEmotions, now])

  const aEmotionSegs = useMemo(() => {
    const m = new Map<string, EmotionSegment[]>()
    for (const entry of aEntries) {
      const end = entry.endTime ? new Date(entry.endTime) : now
      m.set(entry.id, getEventEmotionSegments(aEmotions, new Date(entry.startTime), end))
    }
    return m
  }, [aEntries, aEmotions, now])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const nowTop = (minOfDay(now) - vsm) * PX_PER_MIN
  const showNowLine = date === todayStr && minOfDay(now) >= vsm && minOfDay(now) <= vem

  const renderCol = (
    list: StatusEntry[],
    emotionSegs: Map<string, EmotionSegment[]>,
    otherEmotions: EmotionData[],
    railSide: 'left' | 'right',
  ) => list.flatMap(entry => {
    // Cross-day entries (started previous local day) are clipped to midnight of viewed day
    const isCrossDay = entry.date !== date
    let s: number, e: number
    if (isCrossDay) {
      s = 0
      if (!entry.endTime) {
        e = minOfDay(now)
      } else {
        const endD = new Date(entry.endTime)
        const endLocal = localDateStr(endD)
        if (endLocal > date) { e = 1440 }
        else if (endLocal === date) {
          const rawE = minOfDay(endD)
          if (rawE === 0) return []
          e = rawE
        } else return []
      }
    } else {
      s = minOfDay(new Date(entry.startTime))
      if (!entry.endTime) {
        e = minOfDay(now)
      } else {
        const endD = new Date(entry.endTime)
        const endLocal = localDateStr(endD)
        e = endLocal > date ? 1440 : Math.max(minOfDay(endD), s)
      }
    }
    if (e <= s && e < 1440) return []

    const isTogether = (overlapMap.get(entry.id) ?? 0) > 0
    const segs = emotionSegs.get(entry.id) ?? []

    // Subtle glow boost when both people share the same emotion during a together moment
    let emotionsAlign = false
    if (isTogether) {
      const myEmotion = segs.find(seg => seg.emotion !== null)?.emotion ?? null
      if (myEmotion) {
        const otherEmotion = getEmotionAtTime(otherEmotions, new Date(entry.startTime))
        emotionsAlign = otherEmotion?.id === myEmotion.id
      }
    }

    return [(
      <EntryBlock
        key={entry.id}
        entry={entry}
        top={(s - vsm) * PX_PER_MIN}
        height={(e - s) * PX_PER_MIN}
        isTogether={isTogether}
        emotionsAlign={emotionsAlign}
        emotionSegments={segs}
        railSide={railSide}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )]
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
                {renderCol(jEntries, jEmotionSegs, aEmotions, 'right')}
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
                {renderCol(aEntries, aEmotionSegs, jEmotions, 'left')}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
