'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SplitTimeline from './SplitTimeline'
import { PASTEL_COLORS } from '@/lib/statusConfig'

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

type CalendarEvent = {
  id: string
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  note?: string | null
  color: string
  eventType: string
  isShared: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EVENT_TYPE_OPTIONS = [
  { value: 'event', label: '📅 Event' },
  { value: 'date', label: '💕 Date Night' },
  { value: 'movie', label: '🎬 Movie Night' },
  { value: 'reminder', label: '🔔 Reminder' },
]

function eventTypeEmoji(type: string): string {
  switch (type) {
    case 'date': return '💕'
    case 'movie': return '🎬'
    case 'reminder': return '🔔'
    default: return '📅'
  }
}

function getMondayBasedDay(date: Date): number {
  const day = getDay(date)
  return day === 0 ? 6 : day - 1
}

type NewEventForm = {
  title: string
  eventType: string
  startTime: string
  endTime: string
  note: string
  color: string
  isShared: boolean
}

const DEFAULT_EVENT_FORM: NewEventForm = {
  title: '',
  eventType: 'event',
  startTime: '',
  endTime: '',
  note: '',
  color: '#fce7f3',
  isShared: true,
}

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [monthEntries, setMonthEntries] = useState<StatusEntry[]>([])
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([])
  const [dayEntries, setDayEntries] = useState<StatusEntry[]>([])
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState<NewEventForm>(DEFAULT_EVENT_FORM)
  const [addEventLoading, setAddEventLoading] = useState(false)

  const monthStr = format(currentMonth, 'yyyy-MM')

  const fetchMonthData = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch(`/api/status?month=${monthStr}`),
        fetch(`/api/events?month=${monthStr}`),
      ])
      const statusData = await statusRes.json()
      const eventsData = await eventsRes.json()
      setMonthEntries(statusData.entries ?? [])
      setMonthEvents(eventsData.events ?? [])
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
      setDayEntries(monthEntries.filter((e) => e.date === dateStr))
      setDayEvents(monthEvents.filter((e) => e.date === dateStr))
    }
  }, [selectedDate, monthEntries, monthEvents])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getMondayBasedDay(monthStart)

  const entriesByDate: Record<string, StatusEntry[]> = {}
  for (const entry of monthEntries) {
    if (!entriesByDate[entry.date]) entriesByDate[entry.date] = []
    entriesByDate[entry.date].push(entry)
  }

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const event of monthEvents) {
    if (!eventsByDate[event.date]) eventsByDate[event.date] = []
    eventsByDate[event.date].push(event)
  }

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !selectedDate) return
    setAddEventLoading(true)
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title.trim(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          startTime: newEvent.startTime || null,
          endTime: newEvent.endTime || null,
          note: newEvent.note || null,
          color: newEvent.color,
          eventType: newEvent.eventType,
          isShared: newEvent.isShared,
        }),
      })
      setNewEvent(DEFAULT_EVENT_FORM)
      setShowAddEvent(false)
      await fetchMonthData()
    } catch (err) {
      console.error('Failed to add event', err)
    } finally {
      setAddEventLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      await fetchMonthData()
    } catch (err) {
      console.error('Failed to delete event', err)
    }
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
            <div className="text-3xl mb-2">📅</div>
            <p className="text-gray-400 font-medium">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayEntryList = entriesByDate[dateStr] ?? []
              const dayEventList = eventsByDate[dateStr] ?? []
              const todayDay = isToday(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              const dotEntries = dayEntryList.slice(0, 3)

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
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {dotEntries.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dotEntries.map((entry) => (
                          <span
                            key={entry.id}
                            className="w-1.5 h-1.5 rounded-full border border-white/60"
                            style={{ backgroundColor: entry.color }}
                          />
                        ))}
                      </div>
                    )}
                    {dayEventList.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayEventList.slice(0, 2).map((ev) => (
                          <span key={ev.id} className="text-[8px] leading-none">
                            {eventTypeEmoji(ev.eventType)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, 'yyyy-MM-dd')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Events panel */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold text-violet-700">
                  Events for {format(selectedDate, 'MMM d')} 📅
                </h3>
                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold rounded-full transition-colors"
                >
                  <Plus size={13} />
                  Add Event
                </button>
              </div>

              {/* Add event form */}
              <AnimatePresence>
                {showAddEvent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-violet-50/60 rounded-2xl p-4 mb-4 space-y-3 border border-violet-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newEvent.title}
                          onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                          placeholder="Event title..."
                          autoFocus
                          className="flex-1 border-2 border-violet-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
                        />
                        <button
                          onClick={() => setShowAddEvent(false)}
                          className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newEvent.eventType}
                          onChange={e => setNewEvent(p => ({ ...p, eventType: e.target.value }))}
                          className="border-2 border-violet-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
                        >
                          {EVENT_TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">Color:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {['#fce7f3', '#dbeafe', '#dcfce7', '#fef9c3', '#ede9fe'].map(c => (
                              <button
                                key={c}
                                onClick={() => setNewEvent(p => ({ ...p, color: c }))}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  newEvent.color === c ? 'border-gray-500 scale-125' : 'border-white/80'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 font-bold mb-1 block">Start time (opt)</label>
                          <input
                            type="time"
                            value={newEvent.startTime}
                            onChange={e => setNewEvent(p => ({ ...p, startTime: e.target.value }))}
                            className="w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-bold mb-1 block">End time (opt)</label>
                          <input
                            type="time"
                            value={newEvent.endTime}
                            onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))}
                            className="w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
                          />
                        </div>
                      </div>

                      <input
                        type="text"
                        value={newEvent.note}
                        onChange={e => setNewEvent(p => ({ ...p, note: e.target.value }))}
                        placeholder="Note (optional)..."
                        className="w-full border-2 border-violet-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
                      />

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setNewEvent(p => ({ ...p, isShared: !p.isShared }))}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            newEvent.isShared ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {newEvent.isShared ? '💚 Shared' : '🤍 Just me'}
                        </button>

                        <button
                          onClick={handleAddEvent}
                          disabled={!newEvent.title.trim() || addEventLoading}
                          className="px-5 py-1.5 bg-violet-400 hover:bg-violet-500 text-white text-xs font-bold rounded-full transition-colors disabled:opacity-40"
                        >
                          {addEventLoading ? 'Adding...' : 'Add ✨'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Events list */}
              {dayEvents.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-3">No events — add one! 🌟</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="group flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/60 shadow-sm"
                      style={{ backgroundColor: ev.color }}
                    >
                      <span className="text-base flex-shrink-0">{eventTypeEmoji(ev.eventType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-700 truncate">{ev.title}</p>
                        {(ev.startTime || ev.note) && (
                          <p className="text-xs text-gray-500 truncate">
                            {ev.startTime && `${ev.startTime}${ev.endTime ? ` – ${ev.endTime}` : ''}`}
                            {ev.startTime && ev.note && ' · '}
                            {ev.note}
                          </p>
                        )}
                      </div>
                      {ev.isShared && <span className="text-xs flex-shrink-0">💚</span>}
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 text-red-400 transition-all flex-shrink-0"
                        title="Delete event"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SplitTimeline
              entries={dayEntries}
              date={format(selectedDate, 'yyyy-MM-dd')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
