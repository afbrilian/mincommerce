import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Package, Users, ShoppingCart } from 'lucide-react'
import api from '../services/api'

interface FlashSaleStatus {
  saleId: string
  status: 'upcoming' | 'active' | 'ended'
  productName: string
  productDescription: string
  productPrice: number
  availableQuantity: number
  timeUntilStart: number
  timeUntilEnd: number
}

const FlashSalePage: React.FC = () => {
  const [flashSaleStatus, setFlashSaleStatus] = useState<FlashSaleStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)

  const fetchFlashSaleStatus = useCallback(async () => {
    try {
      const response = await api.flashSale.getStatus()
      if (response.success && response.data) {
        setFlashSaleStatus(response.data)
      } else {
        setError('No flash sale available at the moment')
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error 
        : 'Failed to load flash sale status'
      setError(errorMessage || 'Failed to load flash sale status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateCountdown = useCallback(() => {
    if (!flashSaleStatus) return

    const now = new Date().getTime()
    let targetTime: number

    if (flashSaleStatus.status === 'upcoming') {
      targetTime = now + (flashSaleStatus.timeUntilStart * 1000)
    } else if (flashSaleStatus.status === 'active') {
      targetTime = now + (flashSaleStatus.timeUntilEnd * 1000)
    } else {
      setTimeLeft(null)
      return
    }

    const timeDiff = targetTime - now

    if (timeDiff > 0) {
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    } else {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      // Refresh status when countdown reaches zero
      fetchFlashSaleStatus()
    }
  }, [flashSaleStatus, fetchFlashSaleStatus])

  useEffect(() => {
    fetchFlashSaleStatus()
  }, [fetchFlashSaleStatus])

  useEffect(() => {
    if (flashSaleStatus) {
      updateCountdown()
    }
  }, [flashSaleStatus, updateCountdown])

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      if (flashSaleStatus) {
        updateCountdown()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [flashSaleStatus, updateCountdown])

  const handlePurchase = async () => {
    try {
      const response = await api.purchase.queuePurchase()
      if (response.success) {
        // Handle successful queue
        alert('Purchase request queued! Check your purchase status.')
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error 
        : 'Purchase failed. Please try again.'
      alert(errorMessage || 'Purchase failed. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-yellow-600 bg-yellow-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'ended': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming'
      case 'active': return 'Active'
      case 'ended': return 'Ended'
      default: return 'Unknown'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flash sale...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchFlashSaleStatus}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Flash Sale</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, User</span>
              <button className="text-sm text-indigo-600 hover:text-indigo-500">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {flashSaleStatus && (
            <div className="space-y-6" data-testid="flash-sale-interface">
              {/* Status Card */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Flash Sale Status</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(flashSaleStatus.status)}`}>
                    {getStatusText(flashSaleStatus.status)}
                  </span>
                </div>

                {/* Countdown Timer */}
                {timeLeft && flashSaleStatus.status !== 'ended' && (
                  <div className="mb-6">
                    <div className="flex items-center mb-2">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-700">
                        {flashSaleStatus.status === 'upcoming' ? 'Sale starts in:' : 'Sale ends in:'}
                      </span>
                    </div>
                    <div className="flex space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{timeLeft.hours}</div>
                        <div className="text-xs text-gray-500">Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{timeLeft.minutes}</div>
                        <div className="text-xs text-gray-500">Minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{timeLeft.seconds}</div>
                        <div className="text-xs text-gray-500">Seconds</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Package className="h-6 w-6 text-gray-400 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Product Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {flashSaleStatus.productName}
                    </h4>
                    <p className="text-gray-600 mb-4">
                      {flashSaleStatus.productDescription}
                    </p>
                    <div className="text-3xl font-bold text-indigo-600">
                      ${flashSaleStatus.productPrice}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Available Quantity:</span>
                      <span className="ml-2 text-lg font-semibold text-gray-900">
                        {flashSaleStatus.availableQuantity}
                      </span>
                    </div>
                    
                    {flashSaleStatus.status === 'active' && flashSaleStatus.availableQuantity > 0 && (
                      <button
                        onClick={handlePurchase}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        Buy Now
                      </button>
                    )}
                    
                    {flashSaleStatus.status === 'upcoming' && (
                      <div className="text-center py-4">
                        <p className="text-gray-600">Sale hasn't started yet</p>
                      </div>
                    )}
                    
                    {flashSaleStatus.status === 'ended' && (
                      <div className="text-center py-4">
                        <p className="text-gray-600">Sale has ended</p>
                      </div>
                    )}
                    
                    {flashSaleStatus.status === 'active' && flashSaleStatus.availableQuantity === 0 && (
                      <div className="text-center py-4">
                        <p className="text-red-600 font-medium">Sold Out!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default FlashSalePage
