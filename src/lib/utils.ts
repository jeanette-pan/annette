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

function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(instant)) if (p.type !== 'literal') map[p.type] = p.value
  const asUTC = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  )
  return (asUTC - instant.getTime()) / 60000
}

// UTC instant corresponding to local midnight of `dateStr` (YYYY-MM-DD) in `timeZone`.
// Used so day boundaries can be computed per-viewer instead of per-poster.
export function zonedMidnightUtc(dateStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetWallMs = Date.UTC(y, m - 1, d, 0, 0, 0)
  let instantMs = targetWallMs
  for (let i = 0; i < 2; i++) {
    const offsetMin = getTimeZoneOffsetMinutes(new Date(instantMs), timeZone)
    instantMs = targetWallMs - offsetMin * 60000
  }
  return new Date(instantMs)
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().substring(0, 10)
}

export function nextDateStr(dateStr: string): string {
  return addDaysToDateStr(dateStr, 1)
}

// Calendar date of `instant` as seen in `timeZone`, formatted YYYY-MM-DD.
export function zonedDateStr(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant)
}

// Local (browser) calendar date, as YYYY-MM-DD — no UTC round trip, so it can't
// roll over to the wrong day depending on the viewer's offset from UTC.
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getWeekStart(date: Date): string {
  // Returns Monday of the week containing date, as YYYY-MM-DD
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return localDateStr(d)
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
