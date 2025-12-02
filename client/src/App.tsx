/*
 * SMOOSH - Library Seat Availability Dashboard
 * 
 * This React app:
 * - Connects to the backend via WebSocket for real-time updates
 * - Displays the current status of all 4 seats
 * - Allows manual override of seat states for testing
 */

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import SeatCard from './components/SeatCard'
import './App.css'

// Type definition for seat state (matches backend)
type SeatState = {
  id: number
  occupied: boolean
  updatedAt: string
  expiresAt?: string
}

// Backend server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

function App() {
  const [seats, setSeats] = useState<SeatState[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Initialize WebSocket connection on component mount
  useEffect(() => {
    console.log('Connecting to server:', SERVER_URL)
    
    // Create Socket.IO connection
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    })

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    // Receive initial state when first connecting
    newSocket.on('initialState', (initialSeats: SeatState[]) => {
      console.log('Received initial state:', initialSeats)
      setSeats(initialSeats)
    })

    // Receive real-time updates when a seat changes
    newSocket.on('seatUpdate', (updatedSeat: SeatState) => {
      console.log('Seat update received:', updatedSeat)
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.id === updatedSeat.id ? updatedSeat : seat
        )
      )
    })

    // Handle seat timeout events
    newSocket.on('seatTimeout', (data: { seatId: number, message: string }) => {
      console.log('Seat timeout:', data)
      // Could show a notification here
    })

    // Handle seat extension events
    newSocket.on('seatExtended', (data: { seatId: number, message: string, expiresAt: string }) => {
      console.log('Seat timeout extended:', data)
      // Could show a notification here
    })

    setSocket(newSocket)

    // Cleanup: disconnect when component unmounts
    return () => {
      newSocket.close()
    }
  }, [])

  // Fetch initial state via REST API as fallback
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/seats`)
        const data = await response.json()
        setSeats(data)
      } catch (error) {
        console.error('Failed to fetch initial state:', error)
      }
    }

    fetchInitialState()
  }, [])

  // Handle manual seat toggle (for testing without hardware)
  const handleToggleSeat = async (seatId: number) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/seats/${seatId}/override`, {
        method: 'POST'
      })
      const updatedSeat = await response.json()
      
      // Update local state (WebSocket will also update it, but this is immediate)
      setSeats(prevSeats =>
        prevSeats.map(seat =>
          seat.id === updatedSeat.id ? updatedSeat : seat
        )
      )
    } catch (error) {
      console.error('Failed to toggle seat:', error)
    }
  }

  // Handle extending seat timeout (user confirms they're still there)
  const handleExtendTimeout = async (seatId: number) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/seats/${seatId}/extend`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (response.ok) {
        // Update local state
        setSeats(prevSeats =>
          prevSeats.map(seat =>
            seat.id === result.id ? result : seat
          )
        )
        console.log(`Timeout extended for seat ${seatId}`)
      } else {
        console.error('Failed to extend timeout:', result.error)
      }
    } catch (error) {
      console.error('Failed to extend timeout:', error)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>SMOOSH – Library Seat Availability</h1>
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '●' : '○'}
          </span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <main className="library-layout">
        {seats.length === 0 ? (
          <p className="loading">Loading seat status...</p>
        ) : (
          <div className="library-floor-plan">
            {/* Library Layout Legend */}
            <div className="layout-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <div className="legend-color occupied"></div>
                <span>Occupied</span>
              </div>
            </div>

            {/* Study Area Layout */}
            <div className="study-areas">
              <div className="study-section">
                <div className="tables-row">
                  <SeatCard
                    key={seats[0]?.id}
                    seat={seats[0]}
                    onToggle={() => handleToggleSeat(seats[0]?.id)}
                    onExtendTimeout={() => handleExtendTimeout(seats[0]?.id)}
                    position="table-1"
                  />
                  <SeatCard
                    key={seats[1]?.id}
                    seat={seats[1]}
                    onToggle={() => handleToggleSeat(seats[1]?.id)}
                    onExtendTimeout={() => handleExtendTimeout(seats[1]?.id)}
                    position="table-2"
                  />
                </div>
              </div>

              <div className="study-section">
                <div className="tables-row">
                  <SeatCard
                    key={seats[2]?.id}
                    seat={seats[2]}
                    onToggle={() => handleToggleSeat(seats[2]?.id)}
                    onExtendTimeout={() => handleExtendTimeout(seats[2]?.id)}
                    position="table-3"
                  />
                  <SeatCard
                    key={seats[3]?.id}
                    seat={seats[3]}
                    onToggle={() => handleToggleSeat(seats[3]?.id)}
                    onExtendTimeout={() => handleExtendTimeout(seats[3]?.id)}
                    position="table-4"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

