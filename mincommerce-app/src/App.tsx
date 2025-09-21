import React from 'react'
import { ShoppingCart, Zap, Clock, Users } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">MinCommerce</span>
            </div>
            <div className="text-sm text-gray-500">Flash Sale System</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MinCommerce</h1>
          <p className="text-xl text-gray-600 mb-8">
            High-performance flash sale system built with React, TypeScript, and Tailwind CSS
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="card">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4 mx-auto">
                <Zap className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Built with Vite for instant hot reload and optimized builds
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg mb-4 mx-auto">
                <Clock className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                WebSocket integration for live flash sale status updates
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg mb-4 mx-auto">
                <Users className="h-6 w-6 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scalable</h3>
              <p className="text-gray-600">
                Queue-based architecture handles high concurrent loads
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Tech Stack</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                React 18
              </span>
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                TypeScript
              </span>
              <span className="px-4 py-2 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                Tailwind CSS
              </span>
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Vite
              </span>
              <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Zustand
              </span>
              <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                React Query
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
