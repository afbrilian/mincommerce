import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

const Error: React.FC<ErrorProps> = ({ message, onRetry, className = '' }) => {
  return (
    <div className={`bg-error-50 border border-error-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-error-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-error-800">Something went wrong</h3>
          <p className="mt-1 text-sm text-error-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center space-x-1 text-sm font-medium text-error-600 hover:text-error-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Error
