export type EmotionId = 'fulfilled' | 'calm' | 'locked_in' | 'sleepy' | 'low' | 'overwhelmed'

export type Emotion = {
  id: EmotionId
  emoji: string           // used only in stats heatmaps/strips
  label: string
  circleColor: string     // primary — heatmap cells, day strips
  glowColor: string       // rgba for glow effects throughout the app
  cardTint: string        // rgba overlay for single-emotion card background (~20%)
  cardBorder: string      // kept for reference; not rendered on cards
  cardShadow: string      // rgba for card box-shadow glow
  gradientColor: string   // rgba for multi-emotion gradient stops (~30%)
  stripColor: string      // solid for stats day strip
  selectorBg: string      // pastel for stats heatmap cell backgrounds
  gradientFrom: string    // hex for selector circle gradient start (primary)
  gradientTo: string      // hex for selector circle gradient end (secondary)
}

export const EMOTIONS: Emotion[] = [
  {
    id: 'fulfilled',
    emoji: '✨',
    label: 'Fulfilled',
    circleColor: '#F8C8A6',
    glowColor: 'rgba(255,214,186,0.65)',
    cardTint: 'rgba(248,200,166,0.20)',
    cardBorder: '#F8C8A6',
    cardShadow: 'rgba(255,214,186,0.55)',
    gradientColor: 'rgba(247,215,116,0.30)',
    stripColor: '#F8C8A6',
    selectorBg: '#FEF3C7',
    gradientFrom: '#F8C8A6',
    gradientTo: '#F7D774',
  },
  {
    id: 'calm',
    emoji: '🌿',
    label: 'Calm',
    circleColor: '#B7DCC0',
    glowColor: 'rgba(216,243,220,0.65)',
    cardTint: 'rgba(183,220,192,0.20)',
    cardBorder: '#B7DCC0',
    cardShadow: 'rgba(216,243,220,0.55)',
    gradientColor: 'rgba(205,238,214,0.30)',
    stripColor: '#B7DCC0',
    selectorBg: '#D1FAE5',
    gradientFrom: '#B7DCC0',
    gradientTo: '#CDEED6',
  },
  {
    id: 'locked_in',
    emoji: '🎯',
    label: 'Locked In',
    circleColor: '#C9E265',
    glowColor: 'rgba(226,246,163,0.65)',
    cardTint: 'rgba(201,226,101,0.20)',
    cardBorder: '#C9E265',
    cardShadow: 'rgba(226,246,163,0.55)',
    gradientColor: 'rgba(184,216,90,0.30)',
    stripColor: '#C9E265',
    selectorBg: '#D9F99D',
    gradientFrom: '#C9E265',
    gradientTo: '#B8D85A',
  },
  {
    id: 'sleepy',
    emoji: '🌙',
    label: 'Sleepy',
    circleColor: '#C9CCD3',
    glowColor: 'rgba(225,227,232,0.65)',
    cardTint: 'rgba(201,204,211,0.20)',
    cardBorder: '#C9CCD3',
    cardShadow: 'rgba(225,227,232,0.55)',
    gradientColor: 'rgba(174,180,191,0.30)',
    stripColor: '#C9CCD3',
    selectorBg: '#E2E8F0',
    gradientFrom: '#C9CCD3',
    gradientTo: '#AEB4BF',
  },
  {
    id: 'low',
    emoji: '☁️',
    label: 'Low',
    circleColor: '#8FB7D9',
    glowColor: 'rgba(201,221,240,0.65)',
    cardTint: 'rgba(143,183,217,0.20)',
    cardBorder: '#8FB7D9',
    cardShadow: 'rgba(201,221,240,0.55)',
    gradientColor: 'rgba(167,199,231,0.30)',
    stripColor: '#8FB7D9',
    selectorBg: '#BFDBFE',
    gradientFrom: '#8FB7D9',
    gradientTo: '#A7C7E7',
  },
  {
    id: 'overwhelmed',
    emoji: '🔥',
    label: 'Overwhelmed',
    circleColor: '#D96C75',
    glowColor: 'rgba(245,180,184,0.65)',
    cardTint: 'rgba(217,108,117,0.20)',
    cardBorder: '#D96C75',
    cardShadow: 'rgba(245,180,184,0.55)',
    gradientColor: 'rgba(232,139,143,0.30)',
    stripColor: '#D96C75',
    selectorBg: '#FECACA',
    gradientFrom: '#D96C75',
    gradientTo: '#E88B8F',
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

export type EmotionSegment = {
  emotion: Emotion | null   // null = no emotion was active during this slice
  fraction: number          // 0–1 proportion of the event's total duration
}

// Returns the emotion active at a specific moment.
// Entries must be sorted ascending by startTime.
export function getEmotionAtTime(entries: EmotionData[], time: Date): Emotion | null {
  let active: string | null = null
  for (const e of entries) {
    if (new Date(e.startTime) <= time) active = e.emotion
    else break
  }
  return getEmotion(active)
}

// Returns emotion segments covering the full duration of a timeline event.
// Produces multiple segments when the user changed their emotion mid-event.
// Entries must be sorted ascending by startTime.
export function getEventEmotionSegments(
  entries: EmotionData[],
  eventStart: Date,
  eventEnd: Date,
): EmotionSegment[] {
  if (eventEnd <= eventStart) return []

  // Find emotion active at event start (last entry at or before eventStart)
  let active: string | null = null
  for (const e of entries) {
    if (new Date(e.startTime) <= eventStart) active = e.emotion
    else break
  }

  // Collect emotion changes strictly within (eventStart, eventEnd)
  const changes: { time: Date; emotion: string }[] = []
  for (const e of entries) {
    const t = new Date(e.startTime)
    if (t > eventStart && t < eventEnd) changes.push({ time: t, emotion: e.emotion })
  }

  const totalMs = eventEnd.getTime() - eventStart.getTime()

  if (changes.length === 0) {
    return [{ emotion: getEmotion(active), fraction: 1 }]
  }

  const segs: EmotionSegment[] = []
  let segStart = eventStart
  let cur = active

  for (const ch of changes) {
    const ms = ch.time.getTime() - segStart.getTime()
    if (ms > 0) segs.push({ emotion: getEmotion(cur), fraction: ms / totalMs })
    segStart = ch.time
    cur = ch.emotion
  }
  const last = eventEnd.getTime() - segStart.getTime()
  if (last > 0) segs.push({ emotion: getEmotion(cur), fraction: last / totalMs })

  return segs
}

// Build a CSS linear-gradient from emotion segments for multi-emotion cards.
// Hard stops give a clear visible split; a 6% blend zone softens the edge slightly.
export function buildEmotionGradient(segs: EmotionSegment[]): string {
  const stops: string[] = []
  let pos = 0
  for (let i = 0; i < segs.length; i++) {
    const c = segs[i].emotion?.gradientColor ?? 'rgba(0,0,0,0)'
    const from = (pos * 100).toFixed(1)
    pos += segs[i].fraction
    const to   = (pos * 100).toFixed(1)
    const blendStart = (Math.max(0, pos - 0.06) * 100).toFixed(1)
    stops.push(`${c} ${from}%`)
    if (i < segs.length - 1) {
      stops.push(`${c} ${blendStart}%`)
    } else {
      stops.push(`${c} ${to}%`)
    }
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

// Compute day-level emotion segments for the stats day strip.
export function computeDaySegments(
  entries: EmotionData[],
  dateStr: string,
): { emotion: Emotion; startMin: number; endMin: number }[] {
  const dayStart = new Date(dateStr + 'T00:00:00')
  const dayEnd   = new Date(dateStr + 'T23:59:59.999')
  const now      = new Date()
  const effectiveEnd = now < dayEnd ? now : dayEnd

  let priorEmotion: string | null = null
  for (const e of entries) {
    if (new Date(e.startTime) <= dayStart) priorEmotion = e.emotion
    else break
  }

  const changePoints: { min: number; emotion: string }[] = []
  if (priorEmotion) changePoints.push({ min: 0, emotion: priorEmotion })
  for (const e of entries) {
    const t = new Date(e.startTime)
    if (t > dayStart && t <= effectiveEnd) {
      changePoints.push({ min: t.getHours() * 60 + t.getMinutes(), emotion: e.emotion })
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
  totals.forEach((mins, id) => { if (mins > max) { max = mins; best = id } })
  return getEmotion(best)
}
