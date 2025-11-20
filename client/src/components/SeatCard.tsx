/*
 * SeatCard Component
 * 
 * Displays a single seat's status with:
 * - Seat label
 * - Status badge (Open/Taken)
 * - Last updated time
 * - Manual toggle button for testing
 */

import { useMemo } from 'react'
import './SeatCard.css'

type SeatState = {
  id: number
  occupied: boolean
  updatedAt: string
}

type SeatCardProps = {
  seat: SeatState
  onToggle: () => void
}

function SeatCard({ seat, onToggle }: SeatCardProps) {
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

  return (
    <div className={`seat-card ${seat.occupied ? 'occupied' : 'open'}`}>
      <div className="seat-header">
        <h2>Seat {seat.id}</h2>
        <span className={`status-badge ${seat.occupied ? 'taken' : 'open'}`}>
          {seat.occupied ? 'Taken' : 'Open'}
        </span>
      </div>
      
      <div className="seat-info">
        <p className="last-updated">Updated {timeAgo}</p>
      </div>

      <button 
        className="toggle-button"
        onClick={onToggle}
        aria-label={`Toggle seat ${seat.id}`}
      >
        {seat.occupied ? 'Mark as Open' : 'Mark as Taken'}
      </button>
    </div>
  )
}

export default SeatCard

