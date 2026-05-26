import { format, parseISO } from 'date-fns'

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'h:mm a')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d')
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getMonthString(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function msToHours(ms: number): number {
  return Math.round((ms / 1000 / 3600) * 10) / 10
}

export function formatDurationFromDates(start: Date | string, end: Date | string | null): string {
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  const ms = Math.max(0, e.getTime() - s.getTime())
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function isSleepStatus(status: string): boolean {
  const lower = status.toLowerCase()
  return ['sleep', 'sleeping', 'nap', 'napping', 'bedtime', 'bed', 'rest', 'resting'].some(k => lower.includes(k))
}

export function isEatingStatus(status: string): boolean {
  const lower = status.toLowerCase()
  return ['eat', 'eating', 'food', 'lunch', 'dinner', 'breakfast', 'meal', 'snack', 'brunch', 'cook', 'cooking', 'coffee', 'drink'].some(k => lower.includes(k))
}

export function getWeekStart(date: Date): string {
  // Returns Monday of the week containing date, as YYYY-MM-DD
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().substring(0, 10)
}

export function getSleepGoalKey(userId: string): string {
  return `annette_sleep_goal_${userId}`
}

export function getSleepGoalHours(userId: string): number {
  if (typeof window === 'undefined') return 8
  const stored = localStorage.getItem(getSleepGoalKey(userId))
  return stored ? parseFloat(stored) : 8
}

export function setSleepGoalHours(userId: string, hours: number): void {
  localStorage.setItem(getSleepGoalKey(userId), String(hours))
}
