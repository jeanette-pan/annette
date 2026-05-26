'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import DailyTimeline from './DailyTimeline'

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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMondayBasedDay(date: Date): number {
  const day = getDay(date) // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 6 : day - 1 // Mon=0, ..., Sun=6
}

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [monthEntries, setMonthEntries] = useState<StatusEntry[]>([])
  const [dayEntries, setDayEntries] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(false)

  const monthStr = format(currentMonth, 'yyyy-MM')

  const fetchMonthData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/status?month=${monthStr}`)
      const data = await res.json()
      setMonthEntries(data.entries ?? [])
    } catch (err) {
      console.error('Failed to fetch month data', err)
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const filtered = monthEntries.filter((e) => e.date === dateStr)
      setDayEntries(filtered)
    }
  }, [selectedDate, monthEntries])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getMondayBasedDay(monthStart)

  // Group entries by date
  const entriesByDate: Record<string, StatusEntry[]> = {}
  for (const entry of monthEntries) {
    if (!entriesByDate[entry.date]) entriesByDate[entry.date] = []
    entriesByDate[entry.date].push(entry)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-extrabold text-violet-700">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="text-3xl animate-bounce-soft mb-2">📅</div>
            <p className="text-gray-400 font-medium">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Padding cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayEntryList = entriesByDate[dateStr] ?? []
              const todayDay = isToday(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              // Get up to 3 unique statuses for dots
              // Unique entries by color (up to 4 dots per day)
              const dotEntries = dayEntryList.slice(0, 4)

              return (
                <motion.button
                  key={dateStr}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square flex flex-col items-center justify-start pt-1.5 pb-1 rounded-2xl transition-all duration-150 relative ${
                    selected
                      ? 'bg-violet-200 shadow-md'
                      : todayDay
                      ? 'ring-2 ring-violet-400 bg-violet-50'
                      : 'hover:bg-violet-50'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      todayDay ? 'text-violet-600' : 'text-gray-600'
                    } ${selected ? 'text-violet-800' : ''}`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dotEntries.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dotEntries.map((entry) => (
                        <span
                          key={entry.id}
                          className="w-2 h-2 rounded-full border border-white/60"
                          style={{ backgroundColor: entry.color }}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day timeline */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, 'yyyy-MM-dd')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <DailyTimeline
              entries={dayEntries}
              date={format(selectedDate, 'yyyy-MM-dd')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
