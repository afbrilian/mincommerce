import { create } from 'zustand'
import type { FlashSaleStatus, FlashSaleStats, QueueStats } from '../types'

interface FlashSaleState {
  // Flash Sale Status
  flashSaleStatus: FlashSaleStatus | null
  isLoadingStatus: boolean
  statusError: string | null

  // Flash Sale Stats (Admin)
  flashSaleStats: FlashSaleStats | null
  isLoadingStats: boolean
  statsError: string | null

  // Queue Stats
  queueStats: QueueStats | null
  isLoadingQueue: boolean
  queueError: string | null

  // Real-time updates
  lastUpdate: string | null
}

interface FlashSaleActions {
  // Flash Sale Status actions
  setFlashSaleStatus: (status: FlashSaleStatus | null) => void
  setLoadingStatus: (loading: boolean) => void
  setStatusError: (error: string | null) => void

  // Flash Sale Stats actions
  setFlashSaleStats: (stats: FlashSaleStats | null) => void
  setLoadingStats: (loading: boolean) => void
  setStatsError: (error: string | null) => void

  // Queue Stats actions
  setQueueStats: (stats: QueueStats | null) => void
  setLoadingQueue: (loading: boolean) => void
  setQueueError: (error: string | null) => void

  // Real-time updates
  setLastUpdate: (timestamp: string) => void

  // Clear all data
  clearAll: () => void
}

type FlashSaleStore = FlashSaleState & FlashSaleActions

export const useFlashSaleStore = create<FlashSaleStore>(set => ({
  // State
  flashSaleStatus: null,
  isLoadingStatus: false,
  statusError: null,

  flashSaleStats: null,
  isLoadingStats: false,
  statsError: null,

  queueStats: null,
  isLoadingQueue: false,
  queueError: null,

  lastUpdate: null,

  // Actions
  setFlashSaleStatus: status => {
    set({ flashSaleStatus: status, statusError: null })
  },

  setLoadingStatus: loading => {
    set({ isLoadingStatus: loading })
  },

  setStatusError: error => {
    set({ statusError: error })
  },

  setFlashSaleStats: stats => {
    set({ flashSaleStats: stats, statsError: null })
  },

  setLoadingStats: loading => {
    set({ isLoadingStats: loading })
  },

  setStatsError: error => {
    set({ statsError: error })
  },

  setQueueStats: stats => {
    set({ queueStats: stats, queueError: null })
  },

  setLoadingQueue: loading => {
    set({ isLoadingQueue: loading })
  },

  setQueueError: error => {
    set({ queueError: error })
  },

  setLastUpdate: timestamp => {
    set({ lastUpdate: timestamp })
  },

  clearAll: () => {
    set({
      flashSaleStatus: null,
      isLoadingStatus: false,
      statusError: null,
      flashSaleStats: null,
      isLoadingStats: false,
      statsError: null,
      queueStats: null,
      isLoadingQueue: false,
      queueError: null,
      lastUpdate: null
    })
  }
}))
