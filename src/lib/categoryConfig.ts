export type CategoryId =
  | 'food' | 'social' | 'work' | 'school' | 'relationship' | 'wellness'
  | 'transport' | 'life' | 'relax' | 'events' | 'family' | 'sleep'

export type Category = {
  id: CategoryId
  label: string
  emoji: string
  color: string   // pastel hex background (used as card/timeline color)
}

export const CATEGORIES: Category[] = [
  { id: 'social',       label: 'Social',       emoji: '👥',   color: '#fce7f3' },
  { id: 'transport',    label: 'Transport',    emoji: '🚗',   color: '#fed7aa' },
  { id: 'life',         label: 'Life',         emoji: '🏠',   color: '#ecfccb' },
  { id: 'food',         label: 'Food',         emoji: '🍽️',  color: '#dcfce7' },
  { id: 'wellness',     label: 'Wellness',     emoji: '🧘',   color: '#ccfbf1' },
  { id: 'school',       label: 'School',       emoji: '📚',   color: '#e0f2fe' },
  { id: 'work',         label: 'Work',         emoji: '💻',   color: '#dbeafe' },
  { id: 'events',       label: 'Events',       emoji: '🎉',   color: '#ede9fe' },
  { id: 'sleep',        label: 'Sleep',        emoji: '😴',   color: '#f1f5f9' },
  { id: 'family',       label: 'Family',       emoji: '👨‍👩‍👧',  color: '#fef9c3' },
  { id: 'relax',        label: 'Relax',        emoji: '✨',   color: '#fdf4ff' },
  { id: 'relationship', label: 'Relationship', emoji: '💕',   color: '#fee2e2' },
]

export const CATEGORY_MAP = new Map<CategoryId, Category>(
  CATEGORIES.map(c => [c.id, c])
)

export function getCategory(id: string | null | undefined): Category | null {
  if (!id) return null
  return CATEGORY_MAP.get(id as CategoryId) ?? null
}
