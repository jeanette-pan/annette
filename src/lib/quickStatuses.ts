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
    { label: 'With Family', emoji: '👨‍👩‍👧' },
    { label: 'With Friends', emoji: '👥' },
    { label: 'Date Night', emoji: '💑' },
    { label: 'Video Call', emoji: '📱' },
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
  exercise: [
    { label: 'Gym', emoji: '🏋️' },
    { label: 'Running', emoji: '🏃' },
    { label: 'Yoga', emoji: '🧘' },
    { label: 'Walk', emoji: '🚶' },
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
  pets: [
    { label: 'Dog Walk', emoji: '🐕' },
    { label: 'Vet', emoji: '🐾' },
    { label: 'Pet Time', emoji: '🐱' },
    { label: 'Feeding', emoji: '🦴' },
  ],
  sleep: [
    { label: 'Sleeping', emoji: '😴' },
    { label: 'Napping', emoji: '💤' },
    { label: 'Bedtime', emoji: '🌙' },
  ],
}
