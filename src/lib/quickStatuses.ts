import type { CategoryId } from './categoryConfig'

export type QuickStatus = {
  label: string
  emoji: string
}

export const QUICK_STATUSES: Record<CategoryId, QuickStatus[]> = {
  food: [
    { label: 'Breakfast', emoji: '🍳' },
    { label: 'Lunch', emoji: '🥗' },
    { label: 'Dinner', emoji: '🍽️' },
    { label: 'Snack', emoji: '🍎' },
    { label: 'Coffee', emoji: '☕' },
    { label: 'Boba', emoji: '🧋' },
  ],
  social: [
    { label: 'With Friends', emoji: '👥' },
    { label: 'Hanging Out', emoji: '🤝' },
    { label: 'Video Call', emoji: '📱' },
    { label: 'Party', emoji: '🎉' },
  ],
  work: [
    { label: 'Deep Work', emoji: '💻' },
    { label: 'Meetings', emoji: '📊' },
    { label: 'Admin', emoji: '📝' },
    { label: 'On Call', emoji: '📞' },
  ],
  school: [
    { label: 'Studying', emoji: '📚' },
    { label: 'Class', emoji: '🎓' },
    { label: 'Homework', emoji: '✏️' },
    { label: 'Research', emoji: '🔬' },
  ],
  relationship: [
    { label: 'Date Night', emoji: '💑' },
    { label: 'Quality Time', emoji: '💕' },
    { label: 'Video Call', emoji: '📱' },
    { label: 'Deep Talk', emoji: '💬' },
  ],
  wellness: [
    { label: 'Self Care', emoji: '🛁' },
    { label: 'Meditation', emoji: '🧘' },
    { label: 'Doctor', emoji: '🏥' },
    { label: 'Resting', emoji: '🛋️' },
  ],
  transport: [
    { label: 'Commuting', emoji: '🚌' },
    { label: 'Driving', emoji: '🚗' },
    { label: 'Walking', emoji: '🚶' },
    { label: 'Transit', emoji: '🚇' },
  ],
  life: [
    { label: 'Errands', emoji: '🛒' },
    { label: 'Chores', emoji: '🧹' },
    { label: 'Cooking', emoji: '👩‍🍳' },
    { label: 'Shopping', emoji: '🛍️' },
  ],
  relax: [
    { label: 'Reading', emoji: '📖' },
    { label: 'TV', emoji: '📺' },
    { label: 'Gaming', emoji: '🎮' },
    { label: 'Relaxing', emoji: '☁️' },
  ],
  events: [
    { label: 'Party', emoji: '🎉' },
    { label: 'Concert', emoji: '🎵' },
    { label: 'Birthday', emoji: '🎂' },
    { label: 'Celebration', emoji: '🥂' },
  ],
  family: [
    { label: 'Family Time', emoji: '👨‍👩‍👧' },
    { label: 'Family Dinner', emoji: '🍽️' },
    { label: 'Family Call', emoji: '📱' },
    { label: 'Visiting', emoji: '🏠' },
  ],
  sleep: [
    { label: 'Sleeping', emoji: '😴' },
    { label: 'Napping', emoji: '💤' },
    { label: 'Bedtime', emoji: '🌙' },
  ],
}
