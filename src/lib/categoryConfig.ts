export type CategoryId =
  | 'food' | 'social' | 'work' | 'school' | 'relationship' | 'wellness'
  | 'transport' | 'life' | 'relax' | 'events' | 'family' | 'sleep'

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string       // pastel hex background (used as card/timeline color)
  chartColor: string  // saturated version for bar/pie charts where pastels are invisible
}

export const CATEGORIES: Category[] = [
  { id: 'social',       label: 'Social',       emoji: '👥',   color: '#fce7f3', chartColor: '#f472b6' },
  { id: 'transport',    label: 'Transport',    emoji: '🚗',   color: '#fed7aa', chartColor: '#fb923c' },
  { id: 'life',         label: 'Life',         emoji: '🏠',   color: '#ecfccb', chartColor: '#84cc16' },
  { id: 'food',         label: 'Food',         emoji: '🍽️',  color: '#dcfce7', chartColor: '#4ade80' },
  { id: 'wellness',     label: 'Wellness',     emoji: '🧘',   color: '#ccfbf1', chartColor: '#2dd4bf' },
  { id: 'school',       label: 'School',       emoji: '📚',   color: '#e0f2fe', chartColor: '#38bdf8' },
  { id: 'work',         label: 'Work',         emoji: '💻',   color: '#dbeafe', chartColor: '#60a5fa' },
  { id: 'events',       label: 'Events',       emoji: '🎉',   color: '#ede9fe', chartColor: '#a78bfa' },
  { id: 'sleep',        label: 'Sleep',        emoji: '😴',   color: '#f1f5f9', chartColor: '#94a3b8' },
  { id: 'family',       label: 'Family',       emoji: '👨‍👩‍👧',  color: '#fef9c3', chartColor: '#fbbf24' },
  { id: 'relax',        label: 'Relax',        emoji: '✨',   color: '#fdf4ff', chartColor: '#e879f9' },
  { id: 'relationship', label: 'Relationship', emoji: '💕',   color: '#fee2e2', chartColor: '#f87171' },
]

export const CATEGORY_MAP = new Map<CategoryId, Category>(
  CATEGORIES.map(c => [c.id, c])
)

export function getCategory(id: string | null | undefined): Category | null {
  if (!id) return null
  return CATEGORY_MAP.get(id as CategoryId) ?? null
}
