'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { getStatusConfig } from '@/lib/statusConfig'
import { useCurrentUser } from './UserSelector'

type StatsData = {
  stats: Record<string, { hours: number; percentage: number; count: number }>
  totalHours: number
}

const STATUS_COLORS: Record<string, string> = {
  Sleeping: '#c4b5fd',
  Eating: '#fde68a',
  Working: '#bfdbfe',
  Studying: '#c7d2fe',
  Gaming: '#bbf7d0',
  Out: '#99f6e4',
  Resting: '#fbcfe8',
  Showering: '#a5f3fc',
  Exercising: '#fed7aa',
  Custom: '#fecdd3',
  Unknown: '#e5e7eb',
}

function getColor(status: string): string {
  return STATUS_COLORS[status] ?? '#e5e7eb'
}

export default function StatsView() {
  const currentUser = useCurrentUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)

  const monthStr = format(currentMonth, 'yyyy-MM')

  const fetchStats = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?month=${monthStr}&userId=${currentUser.userId}`)
      const data: StatsData = await res.json()
      setStatsData(data)
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser, monthStr])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const pieData = statsData
    ? Object.entries(statsData.stats).map(([status, data]) => ({
        name: status,
        value: data.hours,
        percentage: data.percentage,
      }))
    : []

  const sortedStatuses = statsData
    ? Object.entries(statsData.stats).sort((a, b) => b[1].hours - a[1].hours)
    : []

  const topStatus = sortedStatuses[0]
  const totalEntries = statsData
    ? Object.values(statsData.stats).reduce((sum, s) => sum + s.count, 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-violet-100 transition-colors text-violet-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-violet-700">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            {currentUser && (
              <p className="text-sm text-gray-400 font-medium mt-0.5">
                Stats for {currentUser.userName}
              </p>
            )}
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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
          <p className="text-violet-500 font-semibold animate-shimmer">Loading your stats...</p>
        </div>
      ) : !statsData || Object.keys(statsData.stats).length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="text-4xl mb-3">🌸</div>
          <p className="text-gray-400 font-medium">No data for this month yet</p>
          <p className="text-gray-300 text-sm mt-1">Start tracking to see your stats!</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-5 text-center"
            >
              <div className="text-3xl font-extrabold text-violet-600">{statsData.totalHours}h</div>
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
                  <div className="text-2xl">
                    {getStatusConfig(topStatus[0]).emoji}
                  </div>
                  <div className="text-xs text-gray-400 font-medium mt-1">Most Common</div>
                  <div className="text-sm font-bold text-gray-600 mt-0.5">{topStatus[0]}</div>
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
              <div className="text-3xl font-extrabold text-violet-600">{totalEntries}</div>
              <div className="text-xs text-gray-400 font-medium mt-1">Status Changes</div>
            </motion.div>
          </div>

          {/* Pie chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
          >
            <h3 className="text-lg font-bold text-violet-700 mb-4">Time Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={getColor(entry.name)} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}h`, 'Hours']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontFamily: 'Nunito' }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontFamily: 'Nunito', fontSize: '12px', fontWeight: '600' }}>
                      {getStatusConfig(value).emoji} {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Status breakdown table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/60 p-6"
          >
            <h3 className="text-lg font-bold text-violet-700 mb-4">Breakdown</h3>
            <div className="space-y-3">
              {sortedStatuses.map(([status, data]) => {
                const config = getStatusConfig(status)
                return (
                  <div key={status} className={`flex items-center gap-3 p-3 rounded-2xl ${config.bgColor}`}>
                    <span className="text-xl">{config.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-700 text-sm">{status}</span>
                        <span className="text-xs text-gray-500 font-medium">
                          {data.hours}h · {data.percentage}% · {data.count}×
                        </span>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${data.percentage}%`,
                            backgroundColor: getColor(status),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
