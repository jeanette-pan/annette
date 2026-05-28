export type EmotionId = 'fulfilled' | 'calm' | 'locked_in' | 'sleepy' | 'low' | 'overwhelmed'

export type Emotion = {
  id: EmotionId
  emoji: string           // used only in stats heatmaps/strips
  label: string
  circleColor: string     // solid fill for the selector circle + heatmap cells
  glowColor: string       // rgba for glow effects throughout the app
  cardTint: string        // rgba overlay for single-emotion card background (~24%)
  cardBorder: string      // solid hex for card border ring
  cardShadow: string      // rgba for card box-shadow glow
  gradientColor: string   // rgba for multi-emotion gradient stops (~32%)
  stripColor: string      // solid for stats day strip
  selectorBg: string      // pastel for stats heatmap cell backgrounds
}

export const EMOTIONS: Emotion[] = [
  {
    id: 'fulfilled',
    emoji: '✨',
    label: 'Fulfilled',
    circleColor: '#F0A030',
    glowColor: 'rgba(240,160,48,0.62)',
    cardTint: 'rgba(255,195,90,0.24)',
    cardBorder: '#F0A030',
    cardShadow: 'rgba(240,160,48,0.50)',
    gradientColor: 'rgba(255,205,110,0.36)',
    stripColor: '#F0A030',
    selectorBg: '#FDE68A',
  },
  {
    id: 'calm',
    emoji: '🌿',
    label: 'Calm',
    circleColor: '#52A878',
    glowColor: 'rgba(82,168,120,0.62)',
    cardTint: 'rgba(130,215,170,0.24)',
    cardBorder: '#52A878',
    cardShadow: 'rgba(82,168,120,0.50)',
    gradientColor: 'rgba(130,215,170,0.36)',
    stripColor: '#52A878',
    selectorBg: '#BBF7D0',
  },
  {
    id: 'locked_in',
    emoji: '🎯',
    label: 'Locked In',
    circleColor: '#84C030',
    glowColor: 'rgba(132,192,48,0.62)',
    cardTint: 'rgba(185,235,95,0.24)',
    cardBorder: '#84C030',
    cardShadow: 'rgba(132,192,48,0.50)',
    gradientColor: 'rgba(185,235,95,0.36)',
    stripColor: '#84C030',
    selectorBg: '#D9F99D',
  },
  {
    id: 'sleepy',
    emoji: '🌙',
    label: 'Sleepy',
    circleColor: '#96A8BC',
    glowColor: 'rgba(150,168,188,0.62)',
    cardTint: 'rgba(195,210,228,0.24)',
    cardBorder: '#96A8BC',
    cardShadow: 'rgba(150,168,188,0.50)',
    gradientColor: 'rgba(195,210,228,0.36)',
    stripColor: '#96A8BC',
    selectorBg: '#E2E8F0',
  },
  {
    id: 'low',
    emoji: '☁️',
    label: 'Low',
    circleColor: '#5A8FC0',
    glowColor: 'rgba(90,143,192,0.62)',
    cardTint: 'rgba(145,185,228,0.24)',
    cardBorder: '#5A8FC0',
    cardShadow: 'rgba(90,143,192,0.50)',
    gradientColor: 'rgba(145,185,228,0.36)',
    stripColor: '#5A8FC0',
    selectorBg: '#BFDBFE',
  },
  {
    id: 'overwhelmed',
    emoji: '🔥',
    label: 'Overwhelmed',
    circleColor: '#BE5A58',
    glowColor: 'rgba(190,90,88,0.62)',
    cardTint: 'rgba(225,145,142,0.24)',
    cardBorder: '#BE5A58',
    cardShadow: 'rgba(190,90,88,0.50)',
    gradientColor: 'rgba(225,145,142,0.36)',
    stripColor: '#BE5A58',
    selectorBg: '#FECACA',
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
      stops.push(`${c} ${blendStart}%`)  // taper before the next color
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
