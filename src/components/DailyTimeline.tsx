'use client'

import { getStatusConfig } from '@/lib/statusConfig'
import { formatTime, formatDate } from '@/lib/utils'
import { parseISO } from 'date-fns'

type StatusEntry = {
  id: string
  userId: string
  userName: string
  status: string
  emoji: string
  note?: string | null
  startTime: string | Date
  endTime?: string | Date | null
  date: string
}

type Props = {
  entries: StatusEntry[]
  date: string
}

export default function DailyTimeline({ entries, date }: Props) {
  const dateLabel = formatDate(parseISO(date))

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6 h-full">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-violet-700">Today&apos;s Timeline</h2>
        <p className="text-sm text-gray-400 font-medium">{dateLabel}</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 animate-bounce-soft">🌸</div>
          <p className="text-gray-400 font-medium">No activities yet today</p>
          <p className="text-gray-300 text-sm mt-1">Set a status to get started!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-violet-100 rounded-full" />

          <div className="space-y-4">
            {entries.map((entry, idx) => {
              const config = getStatusConfig(entry.status)
              const isActive = !entry.endTime
              const isLast = idx === entries.length - 1

              return (
                <div key={entry.id} className="flex gap-4 relative">
                  {/* Dot */}
                  <div className="relative flex-shrink-0 mt-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border-2 border-white ${config.bgColor}`}
                    >
                      {entry.emoji}
                    </div>
                    {isActive && isLast && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${config.bgColor} rounded-2xl p-3 border border-white/60 shadow-sm`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-700 text-sm">{entry.status}</span>
                        {entry.userId && (
                          <span className="text-xs text-gray-400 bg-white/60 rounded-full px-2 py-0.5 font-medium">
                            {entry.userName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {formatTime(entry.startTime)}
                        {isActive ? (
                          <span className="text-green-500 font-bold"> → Now</span>
                        ) : entry.endTime ? (
                          <> – {formatTime(entry.endTime)}</>
                        ) : null}
                      </span>
                    </div>

                    {entry.note && (
                      <p className="text-xs text-gray-500 italic mt-1.5 bg-white/50 rounded-lg px-2 py-1">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
