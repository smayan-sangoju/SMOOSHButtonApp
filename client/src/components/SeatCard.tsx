/*
 * SeatCard Component
 * 
 * Displays a single seat's status with:
 * - Seat label
 * - Status badge (Open/Taken)
 * - Last updated time
 * - Manual toggle button for testing
 */

import { useMemo, useState, useEffect } from 'react'
import './SeatCard.css'

type SeatState = {
  id: number
  occupied: boolean
  updatedAt: string
  expiresAt?: string
}

type SeatCardProps = {
  seat: SeatState
  onToggle: () => void
  onExtendTimeout: () => void
  position?: string
}

function SeatCard({ seat, onToggle, onExtendTimeout, position }: SeatCardProps) {
  // Live current time state that updates every second for the countdown timer
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second to make the countdown timer live
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  // Calculate time ago from updatedAt timestamp
  const timeAgo = useMemo(() => {
    const updated = new Date(seat.updatedAt)
    const now = new Date()
    const secondsAgo = Math.floor((now.getTime() - updated.getTime()) / 1000)

    if (secondsAgo < 60) {
      return `${secondsAgo} second${secondsAgo !== 1 ? 's' : ''} ago`
    } else if (secondsAgo < 3600) {
      const minutesAgo = Math.floor(secondsAgo / 60)
      return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
    } else {
      // Format as HH:MM if more than an hour ago
      return updated.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }, [seat.updatedAt])

  // Calculate time remaining until timeout (if occupied) - shows minutes and seconds, updates live
  const timeRemaining = useMemo(() => {
    if (!seat.occupied || !seat.expiresAt) return null
    
    const expires = new Date(seat.expiresAt)
    const now = currentTime
    const msRemaining = expires.getTime() - now.getTime()
    
    if (msRemaining <= 0) return 'Expired'
    
    const totalSeconds = Math.floor(msRemaining / 1000)
    const hoursRemaining = Math.floor(totalSeconds / 3600)
    const minutesRemaining = Math.floor((totalSeconds % 3600) / 60)
    const secondsRemaining = totalSeconds % 60
    
    if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s left`
    } else if (minutesRemaining > 0) {
      return `${minutesRemaining}m ${secondsRemaining}s left`
    } else {
      return `${secondsRemaining}s left`
    }
  }, [seat.occupied, seat.expiresAt, currentTime])

  // Check if timeout is approaching (less than 10 minutes)
  const isTimeoutApproaching = useMemo(() => {
    if (!seat.occupied || !seat.expiresAt) return false
    
    const expires = new Date(seat.expiresAt)
    const now = currentTime
    const msRemaining = expires.getTime() - now.getTime()
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60))
    
    return minutesRemaining <= 10 && minutesRemaining > 0
  }, [seat.occupied, seat.expiresAt, currentTime])

  return (
    <div className={`library-table ${seat.occupied ? 'occupied' : 'available'} ${position || ''}`}>
      {/* Table Surface */}
      <div className="table-surface">
        <div className="table-number">Table {seat.id}</div>
        <div className="table-items">
          {seat.occupied ? '📚💻' : ''}
        </div>
      </div>
      
      {/* Chair */}
      <div className={`chair ${seat.occupied ? 'occupied' : 'available'}`}>
        <div className="chair-back"></div>
        <div className="chair-seat">
          {seat.occupied ? '👤' : ''}
        </div>
      </div>

      {/* Status Info */}
      <div className="table-info">
        <span className={`status-indicator ${seat.occupied ? 'taken' : 'open'}`}>
          {seat.occupied ? 'OCCUPIED' : 'AVAILABLE'}
        </span>
        <div className="last-updated">Updated {timeAgo}</div>
        
        {/* Timer Display */}
        {seat.occupied && timeRemaining && (
          <div className={`timeout-timer ${isTimeoutApproaching ? 'warning' : ''}`}>
            ⏰ {timeRemaining}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="table-actions">
        {/* Extend Timeout Button (only show if occupied and approaching timeout) */}
        {seat.occupied && isTimeoutApproaching && (
          <button 
            className="extend-button"
            onClick={onExtendTimeout}
            aria-label={`Extend timeout for table ${seat.id}`}
            title="Click to extend your time by another hour"
          >
            🕐 Extend Time
          </button>
        )}
        
        {/* Toggle Button (for testing) */}
        <button 
          className="table-toggle-button"
          onClick={onToggle}
          aria-label={`Toggle table ${seat.id}`}
          title="Click to simulate someone sitting/leaving"
        >
          {seat.occupied ? 'Leave Table' : 'Sit Down'}
        </button>
      </div>
    </div>
  )
}

export default SeatCard

