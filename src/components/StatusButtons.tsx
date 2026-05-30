'use client'

export type StatusFormData = {
  status: string
  emoji: string
  note: string
  color: string
  startTime: string
  endTime?: string
  isShared: boolean
  category?: string
}
