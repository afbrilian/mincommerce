/**
 * Flash Sale Utility Functions
 * Shared utilities for flash sale status calculation and related logic
 */

import { FLASH_SALE_STATUS } from '../constants'

export type FlashSaleStatus = 'upcoming' | 'active' | 'ended'

export interface FlashSaleTimeData {
  startTime: string
  endTime: string
}

export interface FlashSaleRelativeTimeData {
  timeUntilStart: number
  timeUntilEnd: number
}

/**
 * Calculate flash sale status based on current time and start/end times
 * @param startTime - ISO string of start time
 * @param endTime - ISO string of end time
 * @returns FlashSaleStatus
 */
export const calculateFlashSaleStatus = (startTime: string, endTime: string): FlashSaleStatus => {
  const now = new Date().getTime()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (now < start) {
    return FLASH_SALE_STATUS.UPCOMING
  } else if (now >= start && now < end) {
    return FLASH_SALE_STATUS.ACTIVE
  } else {
    return FLASH_SALE_STATUS.ENDED
  }
}

/**
 * Calculate flash sale status based on relative time data (from API)
 * @param timeData - Object with timeUntilStart and timeUntilEnd in seconds
 * @returns FlashSaleStatus
 */
export const calculateFlashSaleStatusFromRelative = (
  timeData: FlashSaleRelativeTimeData
): FlashSaleStatus => {
  const { timeUntilStart, timeUntilEnd } = timeData

  // If timeUntilStart > 0, sale hasn't started yet
  if (timeUntilStart > 0) {
    return FLASH_SALE_STATUS.UPCOMING
  }
  // If timeUntilStart <= 0 but timeUntilEnd > 0, sale is active
  else if (timeUntilStart <= 0 && timeUntilEnd > 0) {
    return FLASH_SALE_STATUS.ACTIVE
  }
  // If timeUntilEnd <= 0, sale has ended
  else {
    return FLASH_SALE_STATUS.ENDED
  }
}

/**
 * Check if the buy button should be enabled
 * @param status - Flash sale status
 * @param availableQuantity - Available quantity
 * @returns boolean
 */
export const isBuyButtonEnabled = (status: FlashSaleStatus, availableQuantity: number): boolean => {
  return status === FLASH_SALE_STATUS.ACTIVE && availableQuantity > 0
}

/**
 * Get status badge configuration
 * @param status - Flash sale status
 * @returns Object with color classes and text
 */
export const getStatusBadgeConfig = (status: FlashSaleStatus) => {
  switch (status) {
    case FLASH_SALE_STATUS.UPCOMING:
      return {
        colorClasses: 'bg-yellow-100 text-yellow-800',
        text: 'Upcoming',
        icon: 'Clock'
      }
    case FLASH_SALE_STATUS.ACTIVE:
      return {
        colorClasses: 'bg-green-100 text-green-800',
        text: 'Active',
        icon: 'CheckCircle'
      }
    case FLASH_SALE_STATUS.ENDED:
      return {
        colorClasses: 'bg-red-100 text-red-800',
        text: 'Ended',
        icon: 'XCircle'
      }
    default:
      return {
        colorClasses: 'bg-gray-100 text-gray-800',
        text: 'Unknown',
        icon: 'AlertCircle'
      }
  }
}

/**
 * Get status color classes for different UI contexts
 * @param status - Flash sale status
 * @returns Color classes string
 */
export const getStatusColorClasses = (status: FlashSaleStatus): string => {
  switch (status) {
    case FLASH_SALE_STATUS.UPCOMING:
      return 'text-yellow-600 bg-yellow-100'
    case FLASH_SALE_STATUS.ACTIVE:
      return 'text-green-600 bg-green-100'
    case FLASH_SALE_STATUS.ENDED:
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Get status text for display
 * @param status - Flash sale status
 * @returns Status text
 */
export const getStatusText = (status: FlashSaleStatus): string => {
  switch (status) {
    case FLASH_SALE_STATUS.UPCOMING:
      return 'Upcoming'
    case FLASH_SALE_STATUS.ACTIVE:
      return 'Active'
    case FLASH_SALE_STATUS.ENDED:
      return 'Ended'
    default:
      return 'Unknown'
  }
}

/**
 * Format time in seconds to HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate countdown data for flash sale
 * @param startTime - ISO string of start time
 * @param endTime - ISO string of end time
 * @returns Countdown data object
 */
export const calculateCountdown = (startTime: string, endTime: string) => {
  const now = new Date().getTime()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  const timeUntilStart = Math.max(0, start - now)
  const timeUntilEnd = Math.max(0, end - now)
  const timeSinceStart = Math.max(0, now - start)
  const timeSinceEnd = Math.max(0, now - end)

  return {
    timeUntilStart: Math.floor(timeUntilStart / 1000),
    timeUntilEnd: Math.floor(timeUntilEnd / 1000),
    timeSinceStart: Math.floor(timeSinceStart / 1000),
    timeSinceEnd: Math.floor(timeSinceEnd / 1000)
  }
}
