import React from 'react'
import { CheckCircle, Clock, AlertCircle, XCircle, Package } from 'lucide-react'
import type { PurchaseStatus } from '../types'

interface PurchaseStatusProps {
  purchaseStatus: PurchaseStatus | null
  isLoading?: boolean
}

const PurchaseStatusComponent: React.FC<PurchaseStatusProps> = ({
  purchaseStatus,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Loading purchase status...</span>
        </div>
      </div>
    )
  }

  if (!purchaseStatus) {
    return null
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Purchase Completed'
        }
      case 'processing':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Processing Purchase'
        }
      case 'queued':
        return {
          icon: Package,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Purchase Queued'
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Purchase Failed'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown Status'
        }
    }
  }

  const config = getStatusConfig(purchaseStatus.status)
  const IconComponent = config.icon

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatWaitTime = (seconds?: number) => {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${seconds} seconds`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes} minutes`
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${config.borderColor}`}>
      <div className="flex items-center space-x-3 mb-4">
        <IconComponent className={`h-6 w-6 ${config.color}`} />
        <h3 className={`text-lg font-semibold ${config.color}`}>{config.text}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {purchaseStatus.orderId && (
          <div>
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono text-sm text-gray-900">{purchaseStatus.orderId}</p>
          </div>
        )}

        {purchaseStatus.jobId && (
          <div>
            <p className="text-sm text-gray-500">Job ID</p>
            <p className="font-mono text-sm text-gray-900">{purchaseStatus.jobId}</p>
          </div>
        )}

        {purchaseStatus.purchasedAt && (
          <div>
            <p className="text-sm text-gray-500">Purchased At</p>
            <p className="text-sm text-gray-900">{formatDate(purchaseStatus.purchasedAt)}</p>
          </div>
        )}

        {purchaseStatus.estimatedWaitTime && (
          <div>
            <p className="text-sm text-gray-500">Estimated Wait Time</p>
            <p className="text-sm text-gray-900">
              {formatWaitTime(purchaseStatus.estimatedWaitTime)}
            </p>
          </div>
        )}
      </div>

      {purchaseStatus.status === 'queued' && purchaseStatus.estimatedWaitTime && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            Your purchase is in the queue. Estimated wait time:{' '}
            {formatWaitTime(purchaseStatus.estimatedWaitTime)}
          </p>
        </div>
      )}

      {purchaseStatus.status === 'processing' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">Your purchase is being processed. Please wait...</p>
        </div>
      )}

      {purchaseStatus.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-50 rounded-md">
          <p className="text-sm text-green-800">
            🎉 Congratulations! Your purchase has been completed successfully.
          </p>
        </div>
      )}

      {purchaseStatus.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-50 rounded-md">
          <p className="text-sm text-red-800">
            ❌ Your purchase failed. Please try again or contact support.
          </p>
        </div>
      )}
    </div>
  )
}

export default PurchaseStatusComponent
