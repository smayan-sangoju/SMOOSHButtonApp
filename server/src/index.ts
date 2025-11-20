/*
 * SMOOSH - Library Button Backend Server
 * 
 * This server:
 * - Connects to Arduino via Serial port
 * - Maintains in-memory state of seat availability
 * - Broadcasts real-time updates to connected clients via WebSocket
 * - Provides REST API for querying and overriding seat states
 */

import express from 'express';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';

// Type definitions
type SeatState = {
  id: number;
  occupied: boolean;
  updatedAt: string;
};

// Configuration
const PORT = process.env.PORT || 3001;
const ARDUINO_PORT = process.env.ARDUINO_PORT || 
  (process.platform === 'win32' ? 'COM3' : '/dev/ttyACM0');
const SERIAL_BAUD_RATE = 9600;

// Initialize Express app
const app = express();
const httpServer = new HttpServer(app);

// Initialize Socket.IO for real-time updates
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory state: 4 seats, all initially unoccupied
let seats: SeatState[] = [
  { id: 1, occupied: false, updatedAt: new Date().toISOString() },
  { id: 2, occupied: false, updatedAt: new Date().toISOString() },
  { id: 3, occupied: false, updatedAt: new Date().toISOString() },
  { id: 4, occupied: false, updatedAt: new Date().toISOString() }
];

// Serial port connection
let serialPort: SerialPort | null = null;
let parser: ReadlineParser | null = null;

/*
 * Initialize Serial port connection to Arduino
 */
function initializeSerialPort() {
  try {
    console.log(`Attempting to connect to Arduino on port: ${ARDUINO_PORT}`);
    
    serialPort = new SerialPort({
      path: ARDUINO_PORT,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false
    });

    // Create a parser that reads lines ending with newline
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Handle incoming data from Arduino
    parser.on('data', (data: string) => {
      try {
        // Parse JSON message from Arduino
        const message = JSON.parse(data.trim());
        
        if (message.seatId && typeof message.occupied === 'boolean') {
          const seatId = message.seatId;
          const occupied = message.occupied;
          
          // Update seat state
          const seatIndex = seatId - 1; // Convert to 0-based index
          if (seatIndex >= 0 && seatIndex < seats.length) {
            seats[seatIndex].occupied = occupied;
            seats[seatIndex].updatedAt = new Date().toISOString();
            
            console.log(`Seat ${seatId} updated: ${occupied ? 'OCCUPIED' : 'OPEN'}`);
            
            // Broadcast update to all connected clients
            io.emit('seatUpdate', seats[seatIndex]);
          }
        }
      } catch (error) {
        console.error('Error parsing message from Arduino:', error);
        console.error('Raw data:', data);
      }
    });

    // Handle serial port open
    serialPort.on('open', () => {
      console.log(`✓ Successfully connected to Arduino on ${ARDUINO_PORT}`);
    });

    // Handle serial port errors
    serialPort.on('error', (error: Error) => {
      console.error('Serial port error:', error.message);
    });

    // Handle serial port close
    serialPort.on('close', () => {
      console.log('Serial port closed. Attempting to reconnect in 5 seconds...');
      setTimeout(initializeSerialPort, 5000);
    });

    // Open the serial port
    serialPort.open();

  } catch (error) {
    console.error('Failed to initialize serial port:', error);
    console.error('Make sure:');
    console.error('  1. Arduino is connected via USB');
    console.error('  2. Correct port is set in ARDUINO_PORT environment variable');
    console.error('  3. No other program is using the serial port');
    console.error('  4. Arduino firmware is uploaded and running');
    
    // Retry connection after 5 seconds
    setTimeout(initializeSerialPort, 5000);
  }
}

/*
 * Send a command to Arduino over Serial
 */
function sendToArduino(command: string) {
  if (serialPort && serialPort.isOpen) {
    serialPort.write(command + '\n', (error) => {
      if (error) {
        console.error('Error sending command to Arduino:', error);
      }
    });
  } else {
    console.warn('Serial port not open, cannot send command to Arduino');
  }
}

// REST API Routes

/*
 * GET /api/seats
 * Returns current state of all seats
 */
app.get('/api/seats', (req, res) => {
  res.json(seats);
});

/*
 * POST /api/seats/:id/override
 * Manually toggle a seat's state (for testing without hardware)
 * Also sends update to Arduino so LED matches
 */
app.post('/api/seats/:id/override', (req, res) => {
  const seatId = parseInt(req.params.id);
  const seatIndex = seatId - 1;
  
  if (seatIndex < 0 || seatIndex >= seats.length) {
    return res.status(400).json({ error: 'Invalid seat ID. Must be 1-4.' });
  }
  
  // Toggle the seat state
  seats[seatIndex].occupied = !seats[seatIndex].occupied;
  seats[seatIndex].updatedAt = new Date().toISOString();
  
  console.log(`Seat ${seatId} manually toggled: ${seats[seatIndex].occupied ? 'OCCUPIED' : 'OPEN'}`);
  
  // Send update to Arduino (so LED matches)
  const message = {
    seatId: seatId,
    occupied: seats[seatIndex].occupied
  };
  sendToArduino(JSON.stringify(message));
  
  // Broadcast update to all connected clients
  io.emit('seatUpdate', seats[seatIndex]);
  
  res.json(seats[seatIndex]);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state to newly connected client
  socket.emit('initialState', seats);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Waiting for Arduino connection on ${ARDUINO_PORT}...`);
  
  // Initialize serial port connection
  initializeSerialPort();
});

