export const USERS = {
  jeanette: {
    id: 'jeanette',
    name: 'Jeanette',
    mascot: '🐧',
    mascotLabel: 'cozy penguin',
    bgClass: 'bg-violet-100',
    borderClass: 'border-violet-200',
    textClass: 'text-violet-700',
    themeHex: '#ede9fe',
    accentHex: '#8b5cf6',
    buttonClass: 'bg-violet-400 hover:bg-violet-500',
    messages: [
      'Thinking of you 💜',
      'Miss you, penguin 🐧',
      'Hope you\'re having a wonderful day 💜',
      'Sending you all my love 🐧💜',
    ],
  },
  anthony: {
    id: 'anthony',
    name: 'Anthony',
    mascot: '🦕',
    mascotLabel: 'friendly dino',
    bgClass: 'bg-yellow-100',
    borderClass: 'border-yellow-200',
    textClass: 'text-yellow-700',
    themeHex: '#fef9c3',
    accentHex: '#d97706',
    buttonClass: 'bg-yellow-400 hover:bg-yellow-500',
    messages: [
      'Thinking of Anthony 💛',
      'Hope the dino is doing well 🦕',
      'Miss you so much! 💛',
      'Sending all my love, little dino 🦕💛',
    ],
  },
} as const

export type UserId = keyof typeof USERS
export type UserConfig = (typeof USERS)[UserId]

export function getUserConfig(userId: string): UserConfig {
  return (USERS as Record<string, UserConfig>)[userId] ?? USERS.jeanette
}

export function getRandomMessage(userId: string): string {
  const config = getUserConfig(userId)
  const msgs = config.messages as readonly string[]
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export const PASTEL_COLORS = [
  { name: 'Lavender', hex: '#e9d5ff' },
  { name: 'Lilac', hex: '#ddd6fe' },
  { name: 'Lemon', hex: '#fef9c3' },
  { name: 'Butter', hex: '#fef08a' },
  { name: 'Mint', hex: '#d1fae5' },
  { name: 'Sage', hex: '#bbf7d0' },
  { name: 'Peach', hex: '#fed7aa' },
  { name: 'Rose', hex: '#fce7f3' },
  { name: 'Blush', hex: '#fbcfe8' },
  { name: 'Sky', hex: '#bae6fd' },
  { name: 'Periwinkle', hex: '#c7d2fe' },
  { name: 'Seafoam', hex: '#a7f3d0' },
] as const
