'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import { useCurrentUser } from './UserSelector'
import { getUserConfig } from '@/lib/statusConfig'
import { getWeekStart } from '@/lib/utils'
import { EMOTIONS, computeDaySegments, getDominantEmotion, type EmotionData } from '@/lib/emotionConfig'
import { CATEGORIES, getCategory } from '@/lib/categoryConfig'

type Goal = {
  id: string
  categoryId: string
  type: 'daily' | 'weekly' | 'monthly'
  value: number
  unit: 'hours' | 'times'
}

type StatusStat = {
  hours: number
  minutes: number
  percentage: number
  count: number
  emoji: string
  color: string
  categoryId: string
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

function mergeStats(a: StatsData | null, b: StatsData | null): StatsData | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  const merged: Record<string, StatusStat> = { ...a.stats }
  for (const [label, stat] of Object.entries(b.stats)) {
    if (merged[label]) {
      merged[label] = {
        hours: merged[label].hours + stat.hours,
        minutes: merged[label].minutes + stat.minutes,
        percentage: 0,
        count: merged[label].count + stat.count,
        emoji: stat.emoji,
        color: stat.color,
        categoryId: stat.categoryId,
        avgMinutesPerDay: Math.round((merged[label].avgMinutesPerDay + stat.avgMinutesPerDay) / 2),
        longestSessionMinutes: Math.max(merged[label].longestSessionMinutes, stat.longestSessionMinutes),
      }
    } else {
      merged[label] = { ...stat }
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
    dailyBreakdown: a.dailyBreakdown,
  }
}

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  padding: '8px 12px',
  border: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  fontFamily: 'Nunito',
}

const TYPE_FACTORS: Record<Goal['type'], number> = { daily: 1, weekly: 7, monthly: 30 }
const TYPE_LABELS: Record<Goal['type'], string> = { daily: '/day', weekly: '/wk', monthly: '/mo' }

export default function StatsView() {
  const currentUser = useCurrentUser()
  const [period, setPeriod] = useState<Period>('monthly')
  const [userMode, setUserMode] = useState<UserMode>('jeanette')
  const [cursor, setCursor] = useState(new Date())
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [jeanetteData, setJeanetteData] = useState<StatsData | null>(null)
  const [anthonyData, setAnthonyData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([])

  // Goals
  const [goals, setGoals] = useState<Goal[]>([])
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [newGoalCat, setNewGoalCat] = useState('')
  const [newGoalValue, setNewGoalValue] = useState(8)
  const [newGoalUnit, setNewGoalUnit] = useState<Goal['unit']>('hours')
  const [newGoalType, setNewGoalType] = useState<Goal['type']>('daily')

  const goalsKey = currentUser ? `annette_goals_v1_${currentUser.userId}` : ''

  useEffect(() => {
    if (currentUser) setUserMode(currentUser.userId as UserMode)
  }, [currentUser])

  useEffect(() => {
    if (!goalsKey) return
    try {
      const stored = localStorage.getItem(goalsKey)
      if (stored) setGoals(JSON.parse(stored))
    } catch {}
  }, [goalsKey])

  function saveGoals(next: Goal[]) {
    setGoals(next)
    if (goalsKey) localStorage.setItem(goalsKey, JSON.stringify(next))
  }

  function openAddForm() {
    setEditingGoalId(null)
    setNewGoalCat('')
    setNewGoalValue(8)
    setNewGoalUnit('hours')
    setNewGoalType('daily')
    setShowAddGoal(true)
  }

  function startEdit(goal: Goal) {
    setEditingGoalId(goal.id)
    setNewGoalCat(goal.categoryId)
    setNewGoalValue(goal.value)
    setNewGoalUnit(goal.unit)
    setNewGoalType(goal.type)
    setShowAddGoal(true)
  }

  function submitGoal() {
    if (!newGoalCat || newGoalValue <= 0) return
    const goal: Goal = {
      id: editingGoalId ?? (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
      categoryId: newGoalCat,
      type: newGoalType,
      value: newGoalValue,
      unit: newGoalUnit,
    }
    saveGoals(editingGoalId ? goals.map(g => g.id === editingGoalId ? goal : g) : [...goals, goal])
    setShowAddGoal(false)
    setEditingGoalId(null)
  }

  function deleteGoal(id: string) {
    saveGoals(goals.filter(g => g.id !== id))
  }

  function getGoalProgress(goal: Goal): { current: number; target: number } | null {
    if (!statsData) return null
    const statEntry = Object.entries(statsData.stats).find(([, s]) => s.categoryId === goal.categoryId)
    const stat = statEntry?.[1]
    const effectiveTarget = Math.round(goal.value * statsData.periodDays / TYPE_FACTORS[goal.type] * 10) / 10
    const current = goal.unit === 'hours' ? (stat?.hours ?? 0) : (stat?.count ?? 0)
    return { current, target: effectiveTarget }
  }

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

  useEffect(() => { fetchStats() }, [fetchStats])

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
    () => sortedStatuses.map(([label, data]) => ({
      name: label,
      value: data.minutes,
      percentage: data.percentage,
      color: data.color,
      emoji: data.emoji,
    })),
    [sortedStatuses]
  )

  const pieDataByName = useMemo(() => new Map(pieData.map(p => [p.name, p])), [pieData])

  const { topStatus, totalEntries, longestSession } = useMemo(() => ({
    topStatus: sortedStatuses[0] as typeof sortedStatuses[0] | undefined,
    totalEntries: sortedStatuses.reduce((sum, [, s]) => sum + s.count, 0),
    longestSession: sortedStatuses.reduce((max, [, s]) => Math.max(max, s.longestSessionMinutes), 0),
  }), [sortedStatuses])

  const { barData, allStatuses } = useMemo(() => {
    if (!statsData) return { barData: [], allStatuses: [] }
    const barData = statsData.dailyBreakdown.map((day) => {
      const obj: Record<string, string | number> = { date: day.date.substring(5) }
      for (const e of day.entries) obj[e.status] = Math.round(e.minutes / 60 * 10) / 10
      return obj
    })
    return { barData, allStatuses: Object.keys(statsData.stats) }
  }, [statsData])

  const lastStatusIndex = allStatuses.length - 1

  const coupleBarData = useMemo(
    () => userMode === 'both' && jeanetteData && anthonyData
      ? allStatuses.map(label => ({
          status: label,
          emoji: (jeanetteData.stats[label] ?? anthonyData.stats[label])?.emoji ?? '✨',
          Jeanette: jeanetteData.stats[label] ? Math.round(jeanetteData.stats[label].minutes / 60 * 10) / 10 : 0,
          Anthony: anthonyData.stats[label] ? Math.round(anthonyData.stats[label].minutes / 60 * 10) / 10 : 0,
        }))
      : [],
    [userMode, jeanetteData, anthonyData, allStatuses]
  )

  const syncStatuses = useMemo(
    () => userMode === 'both' && jeanetteData && anthonyData
      ? allStatuses
          .filter(s => jeanetteData.stats[s] && anthonyData.stats[s])
          .map(s => ({
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

  const goalsSection = currentUser && (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-violet-700">Goals 🎯</h3>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold hover:bg-violet-200 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {goals.length === 0 && !showAddGoal && (
        <p className="text-gray-300 text-sm text-center py-3">No goals yet — add one to track progress!</p>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const cat = CATEGORIES.find(c => c.id === goal.categoryId)
          if (!cat) return null
          const prog = getGoalProgress(goal)
          const pct = prog && prog.target > 0 ? Math.min(100, Math.round((prog.current / prog.target) * 100)) : 0
          const met = prog ? prog.current >= prog.target : false
          return (
            <div key={goal.id} className="p-3 rounded-2xl border border-white/60" style={{ backgroundColor: cat.color }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{cat.emoji}</span>
                  <span className="font-bold text-gray-700 text-sm truncate">{cat.label}</span>
                  <span className="text-xs text-gray-400 font-medium shrink-0">
                    {goal.value} {goal.unit === 'hours' ? 'hr' : '×'}{TYPE_LABELS[goal.type]}
                  </span>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => startEdit(goal)} className="p-1.5 text-gray-300 hover:text-violet-500 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteGoal(goal.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {prog && (
                <>
                  <div className="w-full bg-white/60 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: met ? '#22c55e' : userConfig.accentHex }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1.5 font-medium">
                    <span>
                      {goal.unit === 'hours'
                        ? `${prog.current}h / ${prog.target}h`
                        : `${prog.current}× / ${prog.target}×`} this {period}
                    </span>
                    {met && <span className="text-green-600 font-bold">🎉 met!</span>}
                    {!met && prog.target > 0 && (
                      <span>{pct}%</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {showAddGoal && (
        <div className="mt-4 p-4 bg-violet-50 rounded-2xl space-y-3 border border-violet-100">
          <p className="text-sm font-bold text-violet-700">{editingGoalId ? 'Edit Goal' : 'New Goal'}</p>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Category</label>
            <select
              value={newGoalCat}
              onChange={e => setNewGoalCat(e.target.value)}
              className="w-full border-2 border-violet-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
            >
              <option value="">Select category…</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Amount</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={newGoalValue}
                onChange={e => setNewGoalValue(parseFloat(e.target.value) || 1)}
                className="w-full border-2 border-violet-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Unit</label>
              <div className="flex gap-1 h-[34px]">
                {(['hours', 'times'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setNewGoalUnit(u)}
                    className={`px-3 rounded-xl text-xs font-bold transition-colors ${
                      newGoalUnit === u ? 'bg-violet-500 text-white' : 'bg-white text-gray-400 border border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {u === 'hours' ? 'hr' : '×'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Period</label>
            <div className="flex gap-1">
              {(['daily', 'weekly', 'monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNewGoalType(t)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${
                    newGoalType === t ? 'bg-violet-500 text-white' : 'bg-white text-gray-400 border border-gray-200 hover:border-violet-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={submitGoal}
              disabled={!newGoalCat || newGoalValue <= 0}
              className="flex-1 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-violet-600 transition-colors"
            >
              {editingGoalId ? 'Save' : 'Add Goal'}
            </button>
            <button
              onClick={() => { setShowAddGoal(false); setEditingGoalId(null) }}
              className="px-4 py-2 bg-white text-gray-500 rounded-xl text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Period + user selector */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5">
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

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor((c) => navBack(period, c))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-extrabold text-violet-700">{getPeriodLabel(period, cursor)}</h2>
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
      ) : (
        <>
          {/* Summary cards */}
          {statsData && Object.keys(statsData.stats).length > 0 && (
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
                    <div className="text-xs text-gray-400 font-medium mt-1">Most Time</div>
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
          )}

          {/* Goals — always visible */}
          {goalsSection}

          {loading ? (
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
              {/* Bar chart */}
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
                      <XAxis dataKey="date" tick={{ fontFamily: 'Nunito', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => `${v}h`} tick={{ fontFamily: 'Nunito', fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
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
                      {allStatuses.map((label, idx) => (
                        <Bar
                          key={label}
                          dataKey={label}
                          stackId="a"
                          fill={statsData?.stats[label]?.color ?? '#e9d5ff'}
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
                      label={({ percentage }) => percentage >= 5 ? `${percentage}%` : ''}
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
                        return [`${formatMins(value)} (${stat?.percentage ?? 0}%)`, `${stat?.emoji ?? ''} ${name}`]
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

              {/* Couple insights */}
              {userMode === 'both' && jeanetteData && anthonyData && coupleBarData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
                >
                  <h3 className="text-lg font-bold text-green-700 mb-4">Couple Insights 💜</h3>

                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-500 mb-3">Hours per Category</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={coupleBarData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <XAxis dataKey="status" tick={{ fontFamily: 'Nunito', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => `${v}h`} tick={{ fontFamily: 'Nunito', fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
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

                  {syncStatuses.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-gray-500">Most Synchronized 🤝</p>
                      {syncStatuses.slice(0, 3).map((s) => (
                        <div key={s.status} className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-100">
                          <span className="text-lg">{s.emoji}</span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-700 text-sm">{s.status}</p>
                            <p className="text-xs text-gray-400">🐧 {formatMins(s.jMin)} · 🦕 {formatMins(s.aMin)}</p>
                          </div>
                          <span className="text-xs font-semibold text-green-600 bg-green-100 rounded-full px-2.5 py-1">
                            diff {formatMins(s.diff)}
                          </span>
                        </div>
                      ))}
                      {syncStatuses.length > 0 && (
                        <>
                          <p className="text-sm font-semibold text-gray-500 mt-4">Biggest Differences</p>
                          {[...syncStatuses].reverse().slice(0, 3).map((s) => (
                            <div key={`diff-${s.status}`} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                              <span className="text-lg">{s.emoji}</span>
                              <div className="flex-1">
                                <p className="font-bold text-gray-700 text-sm">{s.status}</p>
                                <p className="text-xs text-gray-400">🐧 {formatMins(s.jMin)} · 🦕 {formatMins(s.aMin)}</p>
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

              {/* Emotional atmosphere — compact heatmap */}
              {userMode !== 'both' && emotionHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
                >
                  <h3 className="text-lg font-bold text-violet-700 mb-3">Mood 🌈</h3>

                  {period === 'daily' && (() => {
                    const dateStr = format(cursor, 'yyyy-MM-dd')
                    const segs = computeDaySegments(emotionHistory, dateStr)
                    if (!segs.length) return <p className="text-xs text-gray-300 text-center py-2">No mood data for this day.</p>
                    return (
                      <div>
                        <div className="h-6 rounded-xl overflow-hidden flex mb-2.5">
                          {segs.map((seg, i) => (
                            <div
                              key={i}
                              className="h-full"
                              style={{ flex: seg.endMin - seg.startMin, backgroundColor: seg.emotion.stripColor, opacity: 0.85 }}
                              title={`${seg.emotion.emoji} ${seg.emotion.label}: ${formatMins(seg.endMin - seg.startMin)}`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {segs.map((seg, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.emotion.circleColor }} />
                              <span className="text-[10px] text-gray-500">{seg.emotion.emoji} {seg.emotion.label} · {formatMins(seg.endMin - seg.startMin)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {period === 'weekly' && (() => {
                    const weekStart = parseISO(getWeekStart(cursor))
                    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
                    const today = new Date(); today.setHours(23, 59, 59, 999)
                    return (
                      <div>
                        <div className="flex gap-1.5">
                          {days.map(day => {
                            const ds = format(day, 'yyyy-MM-dd')
                            const isFuture = day > today
                            const dom = isFuture ? null : getDominantEmotion(emotionHistory, ds)
                            return (
                              <div key={ds} className={`flex-1 flex flex-col items-center gap-1 ${isFuture ? 'opacity-30' : ''}`}>
                                <div
                                  className="w-full h-8 rounded-lg"
                                  style={{
                                    backgroundColor: dom ? dom.selectorBg : '#f3f4f6',
                                    boxShadow: dom ? `0 0 6px ${dom.glowColor}` : undefined,
                                  }}
                                  title={isFuture ? 'Future' : dom ? `${dom.emoji} ${dom.label}` : 'No data'}
                                />
                                <span className="text-[9px] text-gray-400 font-medium">{format(day, 'EEE')}</span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-gray-100">
                          {EMOTIONS.map(em => (
                            <div key={em.id} className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: em.circleColor }} />
                              <span className="text-[9px] text-gray-400">{em.emoji} {em.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {period === 'monthly' && (() => {
                    const year = cursor.getFullYear()
                    const month = cursor.getMonth()
                    const firstDay = new Date(year, month, 1)
                    const dayCount = new Date(year, month + 1, 0).getDate()
                    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
                    const todayMs = new Date().setHours(23, 59, 59, 999)
                    return (
                      <div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {['M','T','W','T','F','S','S'].map((d, i) => (
                            <div key={i} className="text-[8px] text-gray-300 font-bold text-center pb-0.5">{d}</div>
                          ))}
                          {Array.from({ length: startOffset }).map((_, i) => <div key={`b${i}`} />)}
                          {Array.from({ length: dayCount }, (_, i) => {
                            const day = new Date(year, month, i + 1)
                            const ds = format(day, 'yyyy-MM-dd')
                            const isFuture = day.getTime() > todayMs
                            const dom = isFuture ? null : getDominantEmotion(emotionHistory, ds)
                            return (
                              <div
                                key={ds}
                                className={`h-5 rounded ${isFuture ? 'opacity-20' : ''}`}
                                style={{
                                  backgroundColor: dom ? dom.selectorBg : '#f9fafb',
                                  boxShadow: dom ? `0 0 3px ${dom.glowColor}` : undefined,
                                }}
                                title={isFuture ? '' : dom ? `${dom.emoji} ${dom.label}` : format(day, 'MMM d')}
                              />
                            )
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-gray-100">
                          {EMOTIONS.map(em => (
                            <div key={em.id} className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: em.circleColor }} />
                              <span className="text-[9px] text-gray-400">{em.emoji} {em.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {period === 'yearly' && (() => {
                    const year = cursor.getFullYear()
                    const months = Array.from({ length: 12 }, (_, i) => i)
                    return (
                      <div className="grid grid-cols-6 gap-2">
                        {months.map(m => {
                          const label = format(new Date(year, m, 1), 'MMM')
                          const daysInMonth = new Date(year, m + 1, 0).getDate()
                          const dominated = Array.from({ length: daysInMonth }, (_, d) => {
                            const ds = format(new Date(year, m, d + 1), 'yyyy-MM-dd')
                            return getDominantEmotion(emotionHistory, ds)
                          }).filter(Boolean)
                          const counts: Record<string, number> = {}
                          for (const e of dominated) if (e) counts[e.id] = (counts[e.id] ?? 0) + 1
                          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
                          const em = top ? EMOTIONS.find(e => e.id === top[0]) : null
                          return (
                            <div key={m} className="flex flex-col items-center gap-1">
                              <div
                                className="w-full h-8 rounded-lg"
                                style={{ backgroundColor: em ? em.selectorBg : '#f3f4f6' }}
                                title={em ? em.label : label}
                              />
                              <span className="text-[9px] text-gray-400 font-medium">{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {/* Detailed breakdown — bottom */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
              >
                <h3 className="text-lg font-bold text-violet-700 mb-4">Breakdown</h3>
                <div className="space-y-2.5">
                  {sortedStatuses.map(([label, data]) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-white/60"
                      style={{ backgroundColor: data.color }}
                    >
                      <span className="text-xl shrink-0">{data.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-bold text-gray-900 text-sm truncate">{label}</span>
                          <span className="text-xs text-gray-700 font-medium shrink-0">
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
                          <span className="text-xs text-gray-600">{data.count}× logged</span>
                          <span className="text-xs text-gray-600">avg {formatMins(data.avgMinutesPerDay)}/day</span>
                          <span className="text-xs text-gray-600">longest {formatMins(data.longestSessionMinutes)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </div>
  )
}
