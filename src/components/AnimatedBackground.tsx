'use client'

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Top-left blob */}
      <div
        className="absolute -top-20 -left-20 w-96 h-96 bg-violet-200 opacity-50 blur-3xl animate-blob"
        style={{ animationDelay: '0s' }}
      />
      {/* Top-right blob */}
      <div
        className="absolute -top-10 -right-20 w-80 h-80 bg-yellow-200 opacity-50 blur-3xl animate-blob"
        style={{ animationDelay: '2s' }}
      />
      {/* Bottom-left blob */}
      <div
        className="absolute -bottom-20 -left-10 w-72 h-72 bg-green-200 opacity-50 blur-3xl animate-blob"
        style={{ animationDelay: '4s' }}
      />
      {/* Bottom-right blob */}
      <div
        className="absolute -bottom-10 -right-10 w-96 h-96 bg-pink-200 opacity-50 blur-3xl animate-blob"
        style={{ animationDelay: '6s' }}
      />
      {/* Center blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-100 opacity-40 blur-3xl animate-blob"
        style={{ animationDelay: '3s' }}
      />
    </div>
  )
}
