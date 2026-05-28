export type EmotionId = 'fulfilled' | 'calm' | 'locked_in' | 'sleepy' | 'low' | 'overwhelmed'

export type Emotion = {
  id: EmotionId
  emoji: string
  label: string
  orbColor: string       // solid color for the orb circle + heatmap cell
  glowColor: string      // rgba for box-shadow glow on orb
  tintColor: string      // very subtle rgba for card background overlay
  selectorBg: string     // soft pastel bg for the selector circle
  stripColor: string     // solid color for the emotion day-strip segments
}

export const EMOTIONS: Emotion[] = [
  {
    id: 'fulfilled',
    emoji: '✨',
    label: 'Fulfilled',
    orbColor: '#f5b942',
    glowColor: 'rgba(245,185,66,0.6)',
    tintColor: 'rgba(255,215,100,0.10)',
    selectorBg: '#fde68a',
    stripColor: '#fbbf24',
  },
  {
    id: 'calm',
    emoji: '🌿',
    label: 'Calm',
    orbColor: '#5aab7e',
    glowColor: 'rgba(90,171,126,0.6)',
    tintColor: 'rgba(140,210,175,0.10)',
    selectorBg: '#bbf7d0',
    stripColor: '#6ee7a0',
  },
  {
    id: 'locked_in',
    emoji: '🎯',
    label: 'Locked In',
    orbColor: '#8fc53a',
    glowColor: 'rgba(143,197,58,0.6)',
    tintColor: 'rgba(185,230,80,0.10)',
    selectorBg: '#d9f99d',
    stripColor: '#a3e635',
  },
  {
    id: 'sleepy',
    emoji: '🌙',
    label: 'Sleepy',
    orbColor: '#94a3b8',
    glowColor: 'rgba(148,163,184,0.6)',
    tintColor: 'rgba(200,210,220,0.10)',
    selectorBg: '#e2e8f0',
    stripColor: '#94a3b8',
  },
  {
    id: 'low',
    emoji: '☁️',
    label: 'Low',
    orbColor: '#5a8fc5',
    glowColor: 'rgba(90,143,197,0.6)',
    tintColor: 'rgba(140,180,220,0.10)',
    selectorBg: '#bfdbfe',
    stripColor: '#60a5fa',
  },
  {
    id: 'overwhelmed',
    emoji: '🔥',
    label: 'Overwhelmed',
    orbColor: '#c4706a',
    glowColor: 'rgba(196,112,106,0.6)',
    tintColor: 'rgba(220,150,140,0.10)',
    selectorBg: '#fecaca',
    stripColor: '#f87171',
  },
]

export const EMOTION_MAP = new Map<EmotionId, Emotion>(
  EMOTIONS.map(e => [e.id, e])
)

export function getEmotion(id: string | null | undefined): Emotion | null {
  if (!id) return null
  return EMOTION_MAP.get(id as EmotionId) ?? null
}

export type EmotionData = {
  emotion: string
  startTime: string | Date
}

// Returns the emotion active at `time` given a list of entries sorted asc by startTime.
export function getEmotionAtTime(entries: EmotionData[], time: Date): Emotion | null {
  let active: string | null = null
  for (const e of entries) {
    if (new Date(e.startTime) <= time) {
      active = e.emotion
    } else {
      break
    }
  }
  return getEmotion(active)
}

// Compute emotion segments for a day.
// Returns proportional segments suitable for rendering a day strip.
export function computeDaySegments(
  entries: EmotionData[],
  dateStr: string,
): { emotion: Emotion; startMin: number; endMin: number }[] {
  const dayStart = new Date(dateStr + 'T00:00:00')
  const dayEnd   = new Date(dateStr + 'T23:59:59.999')
  const now      = new Date()
  const effectiveEnd = now < dayEnd ? now : dayEnd

  // Find the emotion active at the very start of the day
  let priorEmotion: string | null = null
  for (const e of entries) {
    if (new Date(e.startTime) <= dayStart) priorEmotion = e.emotion
    else break
  }

  // Collect change-points within this day
  const changePoints: { min: number; emotion: string }[] = []
  if (priorEmotion) changePoints.push({ min: 0, emotion: priorEmotion })
  for (const e of entries) {
    const t = new Date(e.startTime)
    if (t > dayStart && t <= effectiveEnd) {
      const min = t.getHours() * 60 + t.getMinutes()
      changePoints.push({ min, emotion: e.emotion })
    }
  }

  if (changePoints.length === 0) return []

  const endMin = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes()
  const segments: { emotion: Emotion; startMin: number; endMin: number }[] = []

  for (let i = 0; i < changePoints.length; i++) {
    const start = changePoints[i].min
    const end   = i + 1 < changePoints.length ? changePoints[i + 1].min : endMin
    if (end <= start) continue
    const em = getEmotion(changePoints[i].emotion)
    if (em) segments.push({ emotion: em, startMin: start, endMin: end })
  }

  return segments
}

// Returns the dominant emotion (most minutes) for a given day, or null.
export function getDominantEmotion(entries: EmotionData[], dateStr: string): Emotion | null {
  const segs = computeDaySegments(entries, dateStr)
  if (!segs.length) return null
  const totals = new Map<string, number>()
  for (const s of segs) {
    totals.set(s.emotion.id, (totals.get(s.emotion.id) ?? 0) + s.endMin - s.startMin)
  }
  let best: string | null = null, max = 0
  totals.forEach((mins, id) => {
    if (mins > max) { max = mins; best = id }
  })
  return getEmotion(best)
}
