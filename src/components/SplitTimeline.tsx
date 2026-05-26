'use client'

import { useEffect, useState } from 'react'
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
}

type Props = {
  entries: StatusEntry[]
  date: string
}

function EntryCard({ entry, now }: { entry: StatusEntry; now: Date }) {
  const isActive = !entry.endTime
  const start = new Date(entry.startTime)
  const end = entry.endTime ? new Date(entry.endTime) : null
  const durationMs = (end ?? now).getTime() - start.getTime()
  const durationMinutes = Math.floor(Math.max(0, durationMs) / 60000)
  const minHeight = Math.max(56, Math.min(160, durationMinutes * 0.6))
  const isSleep = isSleepStatus(entry.status)

  return (
    <div
      className="relative rounded-2xl p-3 border border-white/70 shadow-sm transition-all duration-300"
      style={{ backgroundColor: entry.color, minHeight: `${minHeight}px` }}
    >
      {/* Active pulsing dot */}
      {isActive && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      )}

      <div className="flex items-start gap-1.5 flex-wrap pr-4">
        <span className="text-base">{entry.emoji}</span>
        <span className="font-bold text-gray-700 text-sm leading-tight">{entry.status}</span>
        {isSleep && (
          <span className="text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5 font-semibold">😴</span>
        )}
      </div>

      <div className="text-xs text-gray-500 font-medium mt-1.5">
        {formatTime(entry.startTime)}
        {isActive ? (
          <span className="text-green-600 font-bold"> → Now</span>
        ) : entry.endTime ? (
          <> – {formatTime(entry.endTime)}</>
        ) : null}
      </div>

      <div className="text-xs text-gray-400 mt-0.5">
        {formatDurationFromDates(entry.startTime, entry.endTime)}
        {isActive && (
          <span className="ml-1 text-green-500 font-medium">
            · active
          </span>
        )}
      </div>

      {entry.note && (
        <p className="text-xs text-gray-500 italic mt-1.5 bg-white/50 rounded-lg px-2 py-1">
          {entry.note}
        </p>
      )}
    </div>
  )
}

function UserColumn({
  userId,
  mascot,
  name,
  headerBg,
  accentColor,
  entries,
  now,
}: {
  userId: string
  mascot: string
  name: string
  headerBg: string
  accentColor: string
  entries: StatusEntry[]
  now: Date
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
    <div className="flex flex-col gap-3">
      {/* Column header */}
      <div
        className="flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-white/60 shadow-sm"
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xl">{mascot}</span>
        <span className="font-bold text-sm" style={{ color: accentColor }}>{name}</span>
        {activeEntry && (
          <span className="ml-auto text-xs font-medium text-green-600">
            Started {activeMinutes} min ago
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
            <EntryCard key={entry.id} entry={entry} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SplitTimeline({ entries, date }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const dateLabel = formatDate(parseISO(date))
  const jeanetteEntries = entries.filter(e => e.userId === 'jeanette')
  const anthonyEntries = entries.filter(e => e.userId === 'anthony')

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6 h-full">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-violet-700">Our Timeline 🌸</h2>
        <p className="text-sm text-gray-400 font-medium">{dateLabel}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 animate-bounce-soft">🌸</div>
          <p className="text-gray-400 font-medium">No activities yet today</p>
          <p className="text-gray-300 text-sm mt-1">Set a status to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UserColumn
            userId="jeanette"
            mascot="🐧"
            name="Jeanette"
            headerBg="#ede9fe"
            accentColor="#8b5cf6"
            entries={jeanetteEntries}
            now={now}
          />
          <UserColumn
            userId="anthony"
            mascot="🦕"
            name="Anthony"
            headerBg="#fef9c3"
            accentColor="#d97706"
            entries={anthonyEntries}
            now={now}
          />
        </div>
      )}
    </div>
  )
}
