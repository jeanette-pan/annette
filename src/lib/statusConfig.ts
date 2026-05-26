export type StatusConfig = {
  label: string
  emoji: string
  mascot: string
  message: string
  bgColor: string
  textColor: string
}

export const DEFAULT_STATUSES: StatusConfig[] = [
  {
    label: 'Sleeping',
    emoji: '💤',
    mascot: '🐧',
    message: 'Rest well, sleepy penguin 🐧',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-700',
  },
  {
    label: 'Eating',
    emoji: '🍱',
    mascot: '🐥',
    message: 'Enjoy your meal, little duck 🐥',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  {
    label: 'Working',
    emoji: '💼',
    mascot: '🦕',
    message: 'Work hard, little dino! 🦕',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    label: 'Studying',
    emoji: '📚',
    mascot: '🐧',
    message: 'Study well, smart penguin 🐧',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
  },
  {
    label: 'Gaming',
    emoji: '🎮',
    mascot: '🦖',
    message: 'Have fun gaming, dino! 🦖',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  {
    label: 'Out',
    emoji: '🚶',
    mascot: '🐥',
    message: 'Stay safe out there, duck 🐥',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
  {
    label: 'Resting',
    emoji: '😴',
    mascot: '🐧',
    message: 'Resting up, cozy penguin 🐧',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  {
    label: 'Showering',
    emoji: '🚿',
    mascot: '🐥',
    message: 'Splish splash, happy duck 🐥',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  {
    label: 'Exercising',
    emoji: '🏃',
    mascot: '🦕',
    message: 'Go go go, active dino! 🦕',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  {
    label: 'Custom',
    emoji: '✨',
    mascot: '🐥',
    message: 'Thinking of you 💜',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
  },
]

export const UNKNOWN_STATUS: StatusConfig = {
  label: 'Unknown',
  emoji: '❓',
  mascot: '🐥',
  message: 'Thinking of you 💜',
  bgColor: 'bg-gray-100',
  textColor: 'text-gray-700',
}

export function getStatusConfig(label: string): StatusConfig {
  return DEFAULT_STATUSES.find((s) => s.label === label) ?? UNKNOWN_STATUS
}
