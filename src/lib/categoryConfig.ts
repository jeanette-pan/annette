export type CategoryId =
  | 'food' | 'social' | 'work' | 'school' | 'exercise' | 'wellness'
  | 'transport' | 'life' | 'relax' | 'events' | 'pets' | 'sleep'

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string   // pastel hex background (used as card/timeline color)
}

export const CATEGORIES: Category[] = [
  { id: 'food',      label: 'Food',      emoji: '🍽️',  color: '#d1fae5' },
  { id: 'social',    label: 'Social',    emoji: '👥',   color: '#fce7f3' },
  { id: 'work',      label: 'Work',      emoji: '💻',   color: '#dbeafe' },
  { id: 'school',    label: 'School',    emoji: '📚',   color: '#e0f2fe' },
  { id: 'exercise',  label: 'Exercise',  emoji: '🏃',   color: '#fef3c7' },
  { id: 'wellness',  label: 'Wellness',  emoji: '🧘',   color: '#ccfbf1' },
  { id: 'transport', label: 'Transport', emoji: '🚗',   color: '#fed7aa' },
  { id: 'life',      label: 'Life',      emoji: '🏠',   color: '#fff7ed' },
  { id: 'relax',     label: 'Relax',     emoji: '✨',   color: '#fdf4ff' },
  { id: 'events',    label: 'Events',    emoji: '🎉',   color: '#ede9fe' },
  { id: 'pets',      label: 'Pets',      emoji: '🐾',   color: '#fef9c3' },
  { id: 'sleep',     label: 'Sleep',     emoji: '😴',   color: '#f1f5f9' },
]

export const CATEGORY_MAP = new Map<CategoryId, Category>(
  CATEGORIES.map(c => [c.id, c])
)

export function getCategory(id: string | null | undefined): Category | null {
  if (!id) return null
  return CATEGORY_MAP.get(id as CategoryId) ?? null
}
