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
