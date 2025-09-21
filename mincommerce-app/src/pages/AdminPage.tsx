import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Settings,
  LogOut,
  Clock,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { SEEDED_IDS, TEST_IDS } from '../constants'
import {
  calculateFlashSaleStatus,
  calculateCountdown,
  formatTime,
  getStatusBadgeConfig,
  type FlashSaleStatus
} from '../utils/flashSaleUtils'
import { FLASH_SALE_STATUS } from '../constants'
import type { FlashSale, FlashSaleStats, FlashSaleFormData } from '../types'

const AdminPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  // State management
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null)
  const [flashSaleStats, setFlashSaleStats] = useState<FlashSaleStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<{
    timeUntilStart: number
    timeUntilEnd: number
    timeSinceStart: number
    timeSinceEnd: number
  } | null>(null)

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FlashSaleFormData>({
    defaultValues: {
      productId: SEEDED_IDS.PRODUCT_ID,
      startTime: '',
      endTime: '',
      saleId: undefined
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Get the most recent flash sale (since we can't hardcode the ID)
  const getMostRecentFlashSale = useCallback(async () => {
    try {
      // Use the seeded flash sale ID
      const saleId = SEEDED_IDS.FLASH_SALE_ID

      const [saleResponse, statsResponse] = await Promise.all([
        api.admin.getFlashSaleDetails(saleId).catch(() => null),
        api.admin.getFlashSaleStats(saleId).catch(() => null)
      ])

      if (saleResponse?.success && saleResponse.data) {
        setFlashSale(saleResponse.data)
        setValue('productId', saleResponse.data.productId)
        setValue('startTime', new Date(saleResponse.data.startTime).toISOString().slice(0, 16))
        setValue('endTime', new Date(saleResponse.data.endTime).toISOString().slice(0, 16))
        setValue('saleId', saleResponse.data.saleId)
      }

      if (statsResponse?.success && statsResponse.data) {
        setFlashSaleStats(statsResponse.data)
      }
    } catch (err) {
      console.error('Error fetching flash sale:', err)
      setError('Unable to load flash sale data')
    } finally {
      setIsLoading(false)
    }
  }, [setValue])

  // Update countdown every second
  useEffect(() => {
    if (!flashSale) return

    const updateCountdown = () => {
      const countdownData = calculateCountdown(flashSale.startTime, flashSale.endTime)
      setCountdown(countdownData)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [flashSale])

  // Load data on component mount
  useEffect(() => {
    getMostRecentFlashSale()
  }, [getMostRecentFlashSale])

  // Handle logout
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Handle form submission
  const onSubmit = async (data: FlashSaleFormData) => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const startTime = new Date(data.startTime)
      const endTime = new Date(data.endTime)

      // Prepare data for API
      const submitData: FlashSaleFormData = {
        productId: data.productId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        saleId: data.saleId
      }

      // Call API
      const response = data.saleId
        ? await api.admin.updateFlashSale(submitData)
        : await api.admin.createFlashSale(submitData)

      if (response.success && response.data) {
        setFlashSale(response.data)
        setSuccess('Flash sale saved successfully!')
        // Reload data to get updated status
        await getMostRecentFlashSale()
      } else {
        throw new Error(response.error || 'Failed to save flash sale')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Get status badge component
  const getStatusBadge = (status: FlashSaleStatus) => {
    const config = getStatusBadgeConfig(status)
    const IconComponent =
      status === FLASH_SALE_STATUS.UPCOMING
        ? Clock
        : status === FLASH_SALE_STATUS.ACTIVE
          ? CheckCircle
          : XCircle

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.colorClasses}`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin console...</p>
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
              <Settings className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Admin Console</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Flash Sale Management Section */}
          <div className="bg-white shadow rounded-lg" data-testid={TEST_IDS.ADMIN_DASHBOARD}>
            <div className="px-4 py-5 sm:p-6">
              <h3
                className="text-lg leading-6 font-medium text-gray-900 mb-6"
                data-testid={TEST_IDS.FLASH_SALE_MANAGEMENT}
              >
                Flash Sale Management
              </h3>

              {/* Flash Sale Status */}
              {flashSale && (
                <div
                  className="mb-6 p-4 bg-gray-50 rounded-lg"
                  data-testid={TEST_IDS.FLASH_SALE_STATUS}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Current Flash Sale Status</h4>
                    <div data-testid={TEST_IDS.STATUS_BADGE}>
                      {getStatusBadge(
                        calculateFlashSaleStatus(flashSale.startTime, flashSale.endTime)
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Product</p>
                      <p className="font-medium" data-testid={TEST_IDS.PRODUCT_NAME}>
                        Limited Edition Gaming Console
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium" data-testid={TEST_IDS.PRODUCT_PRICE}>
                        $599.99
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Available</p>
                      <p className="font-medium" data-testid={TEST_IDS.AVAILABLE_QUANTITY}>
                        {flashSaleStats?.availableQuantity || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Stock</p>
                      <p className="font-medium" data-testid={TEST_IDS.TOTAL_QUANTITY}>
                        {flashSaleStats?.totalQuantity || 0}
                      </p>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  {countdown && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <div className="flex items-center space-x-6">
                        {calculateFlashSaleStatus(flashSale.startTime, flashSale.endTime) ===
                          FLASH_SALE_STATUS.UPCOMING && (
                          <div>
                            <p className="text-sm text-gray-500">Time until start</p>
                            <p
                              className="text-lg font-mono"
                              data-testid={TEST_IDS.TIME_UNTIL_START}
                            >
                              {formatTime(countdown.timeUntilStart)}
                            </p>
                          </div>
                        )}
                        {calculateFlashSaleStatus(flashSale.startTime, flashSale.endTime) ===
                          FLASH_SALE_STATUS.ACTIVE && (
                          <>
                            <div>
                              <p className="text-sm text-gray-500">Time since start</p>
                              <p
                                className="text-lg font-mono"
                                data-testid={TEST_IDS.TIME_SINCE_START}
                              >
                                {formatTime(countdown.timeSinceStart)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Time until end</p>
                              <p
                                className="text-lg font-mono"
                                data-testid={TEST_IDS.TIME_UNTIL_END}
                              >
                                {formatTime(countdown.timeUntilEnd)}
                              </p>
                            </div>
                          </>
                        )}
                        {calculateFlashSaleStatus(flashSale.startTime, flashSale.endTime) ===
                          FLASH_SALE_STATUS.ENDED && (
                          <div>
                            <p className="text-sm text-gray-500">Time since end</p>
                            <p className="text-lg font-mono" data-testid={TEST_IDS.TIME_SINCE_END}>
                              {formatTime(countdown.timeSinceEnd)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {flashSaleStats && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p
                          className="text-2xl font-bold text-blue-600"
                          data-testid={TEST_IDS.TOTAL_ORDERS}
                        >
                          {flashSaleStats.totalOrders}
                        </p>
                        <p className="text-sm text-gray-600">Total Orders</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p
                          className="text-2xl font-bold text-green-600"
                          data-testid={TEST_IDS.CONFIRMED_ORDERS}
                        >
                          {flashSaleStats.confirmedOrders}
                        </p>
                        <p className="text-sm text-gray-600">Confirmed</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded">
                        <p
                          className="text-2xl font-bold text-yellow-600"
                          data-testid={TEST_IDS.PENDING_ORDERS}
                        >
                          {flashSaleStats.pendingOrders}
                        </p>
                        <p className="text-sm text-gray-600">Pending</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <p
                          className="text-2xl font-bold text-purple-600"
                          data-testid={TEST_IDS.SOLD_QUANTITY}
                        >
                          {flashSaleStats.soldQuantity || 0}
                        </p>
                        <p className="text-sm text-gray-600">Sold</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flash Sale Form */}
              <form onSubmit={handleSubmit(onSubmit)} data-testid={TEST_IDS.FLASH_SALE_FORM}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="startTime"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      id="startTime"
                      data-testid={TEST_IDS.START_TIME_INPUT}
                      {...register('startTime', {
                        required: 'Start time is required',
                        validate: value => {
                          if (!value) return 'Start time is required'
                          const startTime = new Date(value)
                          const endTime = new Date(watch('endTime'))
                          if (watch('endTime') && endTime <= startTime) {
                            return 'Start time must be before end time'
                          }
                          return true
                        }
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.startTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.startTime && (
                      <p
                        className="mt-1 text-sm text-red-600"
                        data-testid={TEST_IDS.VALIDATION_ERROR}
                      >
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="endTime"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      id="endTime"
                      data-testid={TEST_IDS.END_TIME_INPUT}
                      {...register('endTime', {
                        required: 'End time is required',
                        validate: value => {
                          if (!value) return 'End time is required'
                          const startTime = new Date(watch('startTime'))
                          const endTime = new Date(value)
                          if (watch('startTime') && endTime <= startTime) {
                            return 'End time must be after start time'
                          }
                          return true
                        }
                      })}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.endTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.endTime && (
                      <p
                        className="mt-1 text-sm text-red-600"
                        data-testid={TEST_IDS.VALIDATION_ERROR}
                      >
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md"
                    data-testid={TEST_IDS.ERROR_MESSAGE}
                  >
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div
                    className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md"
                    data-testid={TEST_IDS.SUCCESS_MESSAGE}
                  >
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm text-green-800">{success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isSaving || isSubmitting}
                    data-testid={TEST_IDS.SAVE_BUTTON}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving || isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Save Flash Sale
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Retry Button for Error State */}
              {error && (
                <div className="mt-4">
                  <button
                    onClick={getMostRecentFlashSale}
                    data-testid={TEST_IDS.RETRY_BUTTON}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminPage
