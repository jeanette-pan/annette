'use client'

import AnimatedBackground from '@/components/AnimatedBackground'
import Navbar from '@/components/Navbar'
import StatsView from '@/components/StatsView'

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-yellow-50 to-green-50">
      <AnimatedBackground />
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-violet-700 mb-6">Stats 📊</h1>
        <StatsView />
      </main>
    </div>
  )
}
