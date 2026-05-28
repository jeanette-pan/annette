'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts'
import { motion } from 'framer-motion'
import { useCurrentUser } from './UserSelector'
import { getUserConfig } from '@/lib/statusConfig'
import { getWeekStart, getSleepGoalHours, setSleepGoalHours, isSleepStatus, isEatingStatus } from '@/lib/utils'
import { EMOTIONS, computeDaySegments, getDominantEmotion, type EmotionData } from '@/lib/emotionConfig'

type StatusStat = {
  hours: number
  minutes: number
  percentage: number
  count: number
  emoji: string
  color: string
  avgMinutesPerDay: number
  longestSessionMinutes: number
}

type DailyBreakdownEntry = {
  status: string
  emoji: string
  color: string
  minutes: number
}

type DailyBreakdown = {
  date: string
  entries: DailyBreakdownEntry[]
}

type StatsData = {
  stats: Record<string, StatusStat>
  totalHours: number
  totalMinutes: number
  periodDays: number
  dailyBreakdown: DailyBreakdown[]
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
type UserMode = 'jeanette' | 'anthony' | 'both'

function formatMins(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function getPeriodLabel(period: Period, cursor: Date): string {
  if (period === 'daily') return format(cursor, 'MMM d, yyyy')
  if (period === 'weekly') {
    const ws = parseISO(getWeekStart(cursor))
    const we = addDays(ws, 6)
    return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
  }
  if (period === 'monthly') return format(cursor, 'MMMM yyyy')
  return format(cursor, 'yyyy')
}

function buildEmotionParams(period: Period, cursor: Date, userId: string): string {
  const base = `/api/emotions?userId=${userId}`
  if (period === 'daily')   return `${base}&date=${format(cursor, 'yyyy-MM-dd')}`
  if (period === 'weekly')  return `${base}&from=${getWeekStart(cursor)}`
  if (period === 'monthly') return `${base}&from=${format(new Date(cursor.getFullYear(), cursor.getMonth(), 1), 'yyyy-MM-dd')}`
  return `${base}&from=${format(new Date(cursor.getFullYear(), 0, 1), 'yyyy-MM-dd')}`
}

function buildApiParams(period: Period, cursor: Date, userId: string): string {
  const base = `/api/stats?period=${period}&userId=${userId}`
  if (period === 'daily') return `${base}&date=${format(cursor, 'yyyy-MM-dd')}`
  if (period === 'weekly') return `${base}&weekStart=${getWeekStart(cursor)}`
  if (period === 'monthly') return `${base}&month=${format(cursor, 'yyyy-MM')}`
  return `${base}&year=${format(cursor, 'yyyy')}`
}

function navForward(period: Period, cursor: Date): Date {
  if (period === 'daily') return addDays(cursor, 1)
  if (period === 'weekly') return addWeeks(cursor, 1)
  if (period === 'monthly') return addMonths(cursor, 1)
  return addYears(cursor, 1)
}

function navBack(period: Period, cursor: Date): Date {
  if (period === 'daily') return subDays(cursor, 1)
  if (period === 'weekly') return subWeeks(cursor, 1)
  if (period === 'monthly') return subMonths(cursor, 1)
  return subYears(cursor, 1)
}

// Merge two stats datasets (for "both" mode)
function mergeStats(a: StatsData | null, b: StatsData | null): StatsData | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  const merged: Record<string, StatusStat> = { ...a.stats }
  for (const [status, stat] of Object.entries(b.stats)) {
    if (merged[status]) {
      merged[status] = {
        hours: merged[status].hours + stat.hours,
        minutes: merged[status].minutes + stat.minutes,
        percentage: 0, // recalculate below
        count: merged[status].count + stat.count,
        emoji: stat.emoji,
        color: stat.color,
        avgMinutesPerDay: Math.round((merged[status].avgMinutesPerDay + stat.avgMinutesPerDay) / 2),
        longestSessionMinutes: Math.max(merged[status].longestSessionMinutes, stat.longestSessionMinutes),
      }
    } else {
      merged[status] = { ...stat }
    }
  }
  const totalMinutes = a.totalMinutes + b.totalMinutes
  for (const stat of Object.values(merged)) {
    stat.percentage = totalMinutes > 0 ? Math.round((stat.minutes / totalMinutes) * 1000) / 10 : 0
  }
  return {
    stats: merged,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalMinutes,
    periodDays: Math.max(a.periodDays, b.periodDays),
    dailyBreakdown: a.dailyBreakdown, // combined daily breakdown not critical for "both" mode
  }
}

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  padding: '8px 12px',
  border: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  fontFamily: 'Nunito',
}

export default function StatsView() {
  const currentUser = useCurrentUser()
  const [period, setPeriod] = useState<Period>('monthly')
  const [userMode, setUserMode] = useState<UserMode>('jeanette')
  const [cursor, setCursor] = useState(new Date())
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [jeanetteData, setJeanetteData] = useState<StatsData | null>(null)
  const [anthonyData, setAnthonyData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sleepGoal, setSleepGoalState] = useState(8)
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([])

  // Set userMode to current user's id when user logs in
  useEffect(() => {
    if (currentUser) {
      setUserMode(currentUser.userId as UserMode)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      setSleepGoalState(getSleepGoalHours(currentUser.userId))
    }
  }, [currentUser])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      if (userMode === 'both') {
        const [resJ, resA] = await Promise.all([
          fetch(buildApiParams(period, cursor, 'jeanette')),
          fetch(buildApiParams(period, cursor, 'anthony')),
        ])
        const [dJ, dA]: [StatsData, StatsData] = await Promise.all([resJ.json(), resA.json()])
        setJeanetteData(dJ)
        setAnthonyData(dA)
        setStatsData(mergeStats(dJ, dA))
      } else {
        const res = await fetch(buildApiParams(period, cursor, userMode))
        const data: StatsData = await res.json()
        setStatsData(data)
        setJeanetteData(null)
        setAnthonyData(null)
      }
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setLoading(false)
    }
  }, [period, cursor, userMode])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Fetch emotion history for individual users (not "both" mode)
  useEffect(() => {
    if (userMode === 'both') { setEmotionHistory([]); return }
    fetch(buildEmotionParams(period, cursor, userMode))
      .then(r => r.json())
      .then(d => setEmotionHistory(d.entries ?? []))
      .catch(() => setEmotionHistory([]))
  }, [period, cursor, userMode])

  const jConfig = getUserConfig('jeanette')
  const aConfig = getUserConfig('anthony')
  const userConfig = currentUser ? getUserConfig(currentUser.userId) : jConfig

  const sortedStatuses = useMemo(
    () => statsData ? Object.entries(statsData.stats).sort((a, b) => b[1].minutes - a[1].minutes) : [],
    [statsData]
  )

  const pieData = useMemo(
    () => sortedStatuses.map(([status, data]) => ({
      name: status,
      value: data.minutes,
      percentage: data.percentage,
      color: data.color,
      emoji: data.emoji,
    })),
    [sortedStatuses]
  )

  const pieDataByName = useMemo(
    () => new Map(pieData.map(p => [p.name, p])),
    [pieData]
  )

  const { topStatus, totalEntries, longestSession } = useMemo(() => ({
    topStatus: sortedStatuses[0] as typeof sortedStatuses[0] | undefined,
    totalEntries: sortedStatuses.reduce((sum, [, s]) => sum + s.count, 0),
    longestSession: sortedStatuses.reduce((max, [, s]) => Math.max(max, s.longestSessionMinutes), 0),
  }), [sortedStatuses])

  // Sleep data
  const { sleepEntries, totalSleepMinutes } = useMemo(() => {
    const sleepEntries = sortedStatuses.filter(([status]) => isSleepStatus(status))
    return { sleepEntries, totalSleepMinutes: sleepEntries.reduce((sum, [, s]) => sum + s.minutes, 0) }
  }, [sortedStatuses])
  const sleepGoalMinutes = sleepGoal * 60

  // Eating data (for daily goals)
  const EATING_GOAL = 3
  const totalEatingCount = useMemo(
    () => sortedStatuses.filter(([status]) => isEatingStatus(status)).reduce((sum, [, s]) => sum + s.count, 0),
    [sortedStatuses]
  )

  // Bar chart data — per day/period breakdown
  const { barData, allStatuses } = useMemo(() => {
    if (!statsData) return { barData: [], allStatuses: [] }
    const barData = statsData.dailyBreakdown.map((day) => {
      const obj: Record<string, string | number> = { date: day.date.substring(5) }
      for (const e of day.entries) {
        obj[e.status] = Math.round(e.minutes / 60 * 10) / 10
      }
      return obj
    })
    return { barData, allStatuses: Object.keys(statsData.stats) }
  }, [statsData])

  const lastStatusIndex = allStatuses.length - 1

  // Couple comparison data (for "both" mode)
  const coupleBarData = useMemo(
    () => userMode === 'both' && jeanetteData && anthonyData
      ? allStatuses.map((status) => ({
          status,
          emoji: (jeanetteData.stats[status] ?? anthonyData.stats[status])?.emoji ?? '✨',
          Jeanette: jeanetteData.stats[status] ? Math.round(jeanetteData.stats[status].minutes / 60 * 10) / 10 : 0,
          Anthony: anthonyData.stats[status] ? Math.round(anthonyData.stats[status].minutes / 60 * 10) / 10 : 0,
        }))
      : [],
    [userMode, jeanetteData, anthonyData, allStatuses]
  )

  // Overlap: statuses where both have entries
  const syncStatuses = useMemo(
    () => userMode === 'both' && jeanetteData && anthonyData
      ? allStatuses
          .filter((s) => jeanetteData.stats[s] && anthonyData.stats[s])
          .map((s) => ({
            status: s,
            emoji: jeanetteData.stats[s].emoji,
            jMin: jeanetteData.stats[s].minutes,
            aMin: anthonyData.stats[s].minutes,
            diff: Math.abs(jeanetteData.stats[s].minutes - anthonyData.stats[s].minutes),
          }))
          .sort((a, b) => a.diff - b.diff)
      : [],
    [userMode, jeanetteData, anthonyData, allStatuses]
  )

  const handleSleepGoalChange = useCallback((val: number) => {
    setSleepGoalState(val)
    if (currentUser) setSleepGoalHours(currentUser.userId, val)
  }, [currentUser])

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ]

  const USER_TABS: { key: UserMode; label: string; emoji: string }[] = [
    { key: 'jeanette', label: 'Jeanette', emoji: '🐧' },
    { key: 'anthony', label: 'Anthony', emoji: '🦕' },
    { key: 'both', label: 'Both', emoji: '💜' },
  ]

  return (
    <div className="space-y-6">
      {/* Period + user selector card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5">
        {/* Period tabs */}
        <div className="flex gap-1 mb-4 bg-violet-50 rounded-2xl p-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                period === tab.key
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-400 hover:text-violet-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* User tabs */}
        <div className="flex gap-2 mb-4">
          {USER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setUserMode(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                userMode === tab.key
                  ? tab.key === 'jeanette'
                    ? 'bg-violet-200 text-violet-800 shadow-sm'
                    : tab.key === 'anthony'
                    ? 'bg-yellow-200 text-yellow-800 shadow-sm'
                    : 'bg-green-100 text-green-700 shadow-sm'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor((c) => navBack(period, c))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-violet-700">
              {getPeriodLabel(period, cursor)}
            </h2>
          </div>
          <button
            onClick={() => setCursor((c) => navForward(period, c))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {!currentUser ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="text-4xl mb-3 animate-bounce-soft">🐧</div>
          <p className="text-gray-400 font-medium">Select a user to see stats</p>
        </div>
      ) : loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="text-4xl mb-3 animate-bounce-soft">📊</div>
          <p className="text-violet-500 font-semibold">Loading your stats...</p>
        </div>
      ) : !statsData || Object.keys(statsData.stats).length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="text-4xl mb-3">🌸</div>
          <p className="text-gray-400 font-medium">No data for this period yet</p>
          <p className="text-gray-300 text-sm mt-1">Start tracking to see your stats!</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5 text-center"
            >
              <div className="text-2xl font-extrabold text-violet-600">{statsData.totalHours}h</div>
              <div className="text-xs text-gray-400 font-medium mt-1">Total Tracked</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5 text-center"
            >
              {topStatus ? (
                <>
                  <div className="text-2xl">{topStatus[1].emoji}</div>
                  <div className="text-xs text-gray-400 font-medium mt-1">Most Common</div>
                  <div className="text-xs font-bold text-gray-600 mt-0.5 truncate">{topStatus[0]}</div>
                </>
              ) : (
                <div className="text-gray-300">—</div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5 text-center"
            >
              <div className="text-2xl font-extrabold text-violet-600">{totalEntries}</div>
              <div className="text-xs text-gray-400 font-medium mt-1">Status Changes</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5 text-center"
            >
              <div className="text-lg font-extrabold text-violet-600">{formatMins(longestSession)}</div>
              <div className="text-xs text-gray-400 font-medium mt-1">Longest Session</div>
            </motion.div>
          </div>

          {/* Bar chart — time per status per day */}
          {barData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
            >
              <h3 className="text-lg font-bold text-violet-700 mb-4">Daily Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontFamily: 'Nunito', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}h`}
                    tick={{ fontFamily: 'Nunito', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => {
                      const stat = statsData?.stats[name]
                      return [`${value}h`, `${stat?.emoji ?? ''} ${name}`]
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const stat = statsData?.stats[value]
                      return (
                        <span style={{ fontFamily: 'Nunito', fontSize: '13px', fontWeight: '600' }}>
                          {stat?.emoji ?? '✨'} {value}
                        </span>
                      )
                    }}
                  />
                  {allStatuses.map((status, idx) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="a"
                      fill={statsData?.stats[status]?.color ?? '#e9d5ff'}
                      radius={idx === lastStatusIndex ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
          >
            <h3 className="text-lg font-bold text-violet-700 mb-4">Time Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percentage }) =>
                    percentage >= 5 ? `${percentage}%` : ''
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => {
                    const stat = pieDataByName.get(name)
                    return [
                      `${formatMins(value)} (${stat?.percentage ?? 0}%)`,
                      `${stat?.emoji ?? ''} ${name}`,
                    ]
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const entry = pieDataByName.get(value as string)
                    return (
                      <span style={{ fontFamily: 'Nunito', fontSize: '13px', fontWeight: '600' }}>
                        {entry?.emoji ?? '✨'} {value}
                      </span>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status breakdown table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
          >
            <h3 className="text-lg font-bold text-violet-700 mb-4">Breakdown</h3>
            <div className="space-y-2.5">
              {sortedStatuses.map(([status, data]) => (
                <div
                  key={status}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/60"
                  style={{ backgroundColor: data.color }}
                >
                  <span className="text-xl shrink-0">{data.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-bold text-gray-700 text-sm truncate">{status}</span>
                      <span className="text-xs text-gray-500 font-medium shrink-0">
                        {formatMins(data.minutes)} · {data.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white/60 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${data.percentage}%`, backgroundColor: userConfig.accentHex }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-400">{data.count}× logged</span>
                      <span className="text-xs text-gray-400">avg {formatMins(data.avgMinutesPerDay)}/day</span>
                      <span className="text-xs text-gray-400">longest {formatMins(data.longestSessionMinutes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sleep section — shown for all periods */}
          {sleepEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
            >
              <h3 className="text-lg font-bold text-violet-700 mb-3">Sleep 😴</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Total sleep this period</span>
                <span className="font-bold text-violet-600">{formatMins(totalSleepMinutes)}</span>
              </div>
            </motion.div>
          )}

          {/* Daily Goals — only in daily period */}
          {period === 'daily' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.37 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
            >
              <h3 className="text-lg font-bold text-violet-700 mb-5">Daily Goals 🎯</h3>
              <div className="space-y-5">

                {/* Sleep goal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">😴</span>
                      <span className="font-semibold text-sm text-gray-700">Sleep</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        value={sleepGoal}
                        onChange={(e) => handleSleepGoalChange(parseFloat(e.target.value))}
                        className="w-14 border-2 border-violet-200 rounded-xl px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-violet-50 text-center"
                      />
                      <span className="text-xs text-gray-400">hr goal</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                    <span>{formatMins(totalSleepMinutes)} slept</span>
                    <span>Goal: {sleepGoal}h</span>
                  </div>
                  <div className="w-full bg-violet-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (totalSleepMinutes / sleepGoalMinutes) * 100)}%`,
                        backgroundColor: '#8b5cf6',
                      }}
                    />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${totalSleepMinutes >= sleepGoalMinutes ? 'text-green-600' : 'text-gray-400'}`}>
                    {totalSleepMinutes >= sleepGoalMinutes
                      ? `🎉 Goal hit! +${formatMins(totalSleepMinutes - sleepGoalMinutes)}`
                      : `${formatMins(sleepGoalMinutes - totalSleepMinutes)} to go`}
                  </p>
                </div>

                {/* Eating goal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍽️</span>
                      <span className="font-semibold text-sm text-gray-700">Meals</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{totalEatingCount} / {EATING_GOAL} logged</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (totalEatingCount / EATING_GOAL) * 100)}%`,
                        backgroundColor: '#f97316',
                      }}
                    />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${totalEatingCount >= EATING_GOAL ? 'text-green-600' : 'text-gray-400'}`}>
                    {totalEatingCount >= EATING_GOAL
                      ? '🎉 Goal hit!'
                      : `${EATING_GOAL - totalEatingCount} more meal${EATING_GOAL - totalEatingCount !== 1 ? 's' : ''} to go`}
                  </p>
                </div>

              </div>
            </motion.div>
          )}

          {/* Couple insights */}
          {userMode === 'both' && jeanetteData && anthonyData && coupleBarData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
            >
              <h3 className="text-lg font-bold text-green-700 mb-4">Couple Insights 💜</h3>

              {/* Side by side bar chart */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 mb-3">Hours per Activity</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={coupleBarData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis
                      dataKey="status"
                      tick={{ fontFamily: 'Nunito', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}h`}
                      tick={{ fontFamily: 'Nunito', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number, name: string) => [`${value}h`, name]}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontFamily: 'Nunito', fontSize: '13px', fontWeight: '600' }}>
                          {value === 'Jeanette' ? '🐧 Jeanette' : '🦕 Anthony'}
                        </span>
                      )}
                    />
                    <Bar dataKey="Jeanette" fill={jConfig.accentHex} radius={[4, 4, 0, 0]} opacity={0.85} />
                    <Bar dataKey="Anthony" fill={aConfig.accentHex} radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Most synchronized */}
              {syncStatuses.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-500">Most Synchronized 🤝</p>
                  {syncStatuses.slice(0, 3).map((s) => (
                    <div key={s.status} className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-100">
                      <span className="text-lg">{s.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-700 text-sm">{s.status}</p>
                        <p className="text-xs text-gray-400">
                          🐧 {formatMins(s.jMin)} · 🦕 {formatMins(s.aMin)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-green-600 bg-green-100 rounded-full px-2.5 py-1">
                        diff {formatMins(s.diff)}
                      </span>
                    </div>
                  ))}

                  {/* Top differences */}
                  {syncStatuses.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-gray-500 mt-4">Biggest Differences</p>
                      {[...syncStatuses].reverse().slice(0, 3).map((s) => (
                        <div key={`diff-${s.status}`} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                          <span className="text-lg">{s.emoji}</span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-700 text-sm">{s.status}</p>
                            <p className="text-xs text-gray-400">
                              🐧 {formatMins(s.jMin)} · 🦕 {formatMins(s.aMin)}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-full px-2.5 py-1">
                            {formatMins(s.diff)} apart
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
          {/* Emotional atmosphere — individual users only */}
          {userMode !== 'both' && emotionHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
            >
              <h3 className="text-lg font-bold text-violet-700 mb-4">Emotional Atmosphere 🌈</h3>

              {/* Daily: horizontal emotion strip */}
              {period === 'daily' && (() => {
                const dateStr = format(cursor, 'yyyy-MM-dd')
                const segs = computeDaySegments(emotionHistory, dateStr)
                if (!segs.length) return <p className="text-xs text-gray-300 text-center py-2">No mood data for this day.</p>
                return (
                  <div>
                    <div className="h-7 rounded-xl overflow-hidden flex mb-3">
                      {segs.map((seg, i) => (
                        <div
                          key={i}
                          className="h-full"
                          style={{ flex: seg.endMin - seg.startMin, backgroundColor: seg.emotion.stripColor, opacity: 0.82 }}
                          title={`${seg.emotion.emoji} ${seg.emotion.label}: ${formatMins(seg.endMin - seg.startMin)}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                      {segs.map((seg, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.emotion.circleColor }} />
                          <span className="text-[10px] text-gray-500">{seg.emotion.emoji} {seg.emotion.label} · {formatMins(seg.endMin - seg.startMin)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Weekly: 7-day dominant emotion heatmap */}
              {period === 'weekly' && (() => {
                const weekStart = parseISO(getWeekStart(cursor))
                const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
                return (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Dominant mood each day</p>
                    <div className="flex gap-2">
                      {days.map(day => {
                        const ds = format(day, 'yyyy-MM-dd')
                        const dom = getDominantEmotion(emotionHistory, ds)
                        return (
                          <div key={ds} className="flex-1 flex flex-col items-center gap-1.5">
                            <div
                              className="w-full aspect-square rounded-xl flex items-center justify-center text-lg"
                              style={{
                                backgroundColor: dom ? dom.selectorBg : '#f3f4f6',
                                boxShadow: dom ? `0 0 8px ${dom.glowColor}` : undefined,
                              }}
                              title={dom ? `${dom.emoji} ${dom.label}` : 'No data'}
                            >
                              {dom ? dom.emoji : <span className="text-gray-300 text-xs">·</span>}
                            </div>
                            <span className="text-[9px] text-gray-400 font-medium">{format(day, 'EEE')}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Monthly: calendar grid heatmap */}
              {period === 'monthly' && (() => {
                const year = cursor.getFullYear()
                const month = cursor.getMonth()
                const firstDay = new Date(year, month, 1)
                const dayCount = new Date(year, month + 1, 0).getDate()
                // Monday-first offset: Sun=0 → offset 6, Mon=1 → offset 0, etc.
                const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
                return (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Dominant mood each day</p>
                    <div className="grid grid-cols-7 gap-1">
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <div key={i} className="text-[9px] text-gray-400 font-bold text-center pb-1">{d}</div>
                      ))}
                      {Array.from({ length: startOffset }).map((_, i) => <div key={`b${i}`} />)}
                      {Array.from({ length: dayCount }, (_, i) => {
                        const ds = format(new Date(year, month, i + 1), 'yyyy-MM-dd')
                        const dom = getDominantEmotion(emotionHistory, ds)
                        return (
                          <div
                            key={ds}
                            className="aspect-square rounded-lg flex items-center justify-center text-[10px]"
                            style={{
                              backgroundColor: dom ? dom.selectorBg : '#f9fafb',
                              boxShadow: dom ? `0 0 4px ${dom.glowColor}` : undefined,
                            }}
                            title={dom ? `${dom.emoji} ${dom.label}` : format(new Date(year, month, i + 1), 'MMM d')}
                          >
                            {dom ? dom.emoji : <span className="text-gray-200 text-[8px]">{i + 1}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Legend */}
              {(period === 'weekly' || period === 'monthly') && (
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-gray-100">
                  {EMOTIONS.map(em => (
                    <div key={em.id} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: em.circleColor }} />
                      <span className="text-[9px] text-gray-400">{em.emoji} {em.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
