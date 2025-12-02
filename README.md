# SMOOSH – Library Button

A real-time library seat availability system using Arduino, Node.js, and React.

## Overview

This project consists of three main components:

1. **Arduino Firmware** (`/firmware`) - Monitors physical buttons and controls LEDs
2. **Backend Server** (`/server`) - Node.js server that reads serial data and broadcasts updates
3. **Frontend Dashboard** (`/client`) - React web app that displays seat status in real-time

### How It Works

1. When a student presses a button on the Arduino, the firmware detects the press (with debouncing)
2. The Arduino toggles the corresponding LED and sends a JSON message over USB Serial
3. The backend server reads the serial message and updates its in-memory state
4. The backend broadcasts the update to all connected web clients via WebSocket
5. The React frontend receives the update and immediately reflects the change in the UI

## Prerequisites

- **Arduino IDE** (version 1.8+ or 2.0+) - [Download here](https://www.arduino.cc/en/software)
- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** or **pnpm** (comes with Node.js)
- **Arduino Uno** with USB cable
- **Hardware components**:
  - 4 momentary push buttons
  - 4 LEDs
  - Resistors (appropriate values for your LEDs)
  - Breadboard and jumper wires

## Hardware Setup

### Wiring Configuration

The firmware assumes the following pin assignments:

- **Buttons** (with INPUT_PULLUP, so button press = LOW):
  - Seat 1: Digital Pin 2
  - Seat 2: Digital Pin 3
  - Seat 3: Digital Pin 4
  - Seat 4: Digital Pin 5

- **LEDs** (active HIGH):
  - Seat 1: Digital Pin 6
  - Seat 2: Digital Pin 7
  - Seat 3: Digital Pin 8
  - Seat 4: Digital Pin 9

### Wiring Tips

- Connect one side of each button to the assigned digital pin
- Connect the other side of each button to GND (pull-up resistors are internal)
- Connect each LED's anode (long leg) through a resistor (220Ω-1kΩ) to the assigned digital pin
- Connect each LED's cathode (short leg) to GND

## Installation & Setup

### Step 1: Flash the Arduino Firmware

1. Open Arduino IDE
2. Open the file `firmware/smoosh_button.ino`
3. Select your board: **Tools → Board → Arduino Uno**
4. Select the correct port: **Tools → Port → [Your Arduino Port]**
   - On Windows: Usually `COM3`, `COM4`, etc.
   - On macOS/Linux: Usually `/dev/tty.usbmodem*` or `/dev/ttyACM0`
5. Click **Upload** (or press `Ctrl+U` / `Cmd+U`)
6. Open the Serial Monitor (**Tools → Serial Monitor**) and set baud rate to **9600**
7. You should see initial messages like:
   ```json
   {"seatId":1,"occupied":false}
   {"seatId":2,"occupied":false}
   {"seatId":3,"occupied":false}
   {"seatId":4,"occupied":false}
   ```

### Step 2: Find Your Arduino Serial Port

**Windows:**
- Open **Device Manager** → **Ports (COM & LPT)**
- Look for "Arduino Uno" or "USB Serial Port"
- Note the COM number (e.g., `COM3`)

**macOS:**
- Open Terminal and run: `ls /dev/tty.*`
- Look for `/dev/tty.usbmodem*` or `/dev/tty.usbserial*`

**Linux:**
- Open Terminal and run: `ls /dev/tty*`
- Look for `/dev/ttyACM0` or `/dev/ttyUSB0`

### Step 3: Set Up the Backend Server

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   # Windows example
   ARDUINO_PORT=COM3
   
   # macOS/Linux example
   # ARDUINO_PORT=/dev/ttyACM0
   
   PORT=3001
   ```

4. Update `ARDUINO_PORT` in `.env` with your actual port from Step 2

5. Start the server:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   Server running on http://localhost:3001
   Attempting to connect to Arduino on port: COM3
   ✓ Successfully connected to Arduino on COM3
   ```

### Step 4: Set Up the Frontend Client

1. Open a **new terminal window** (keep the server running)

2. Navigate to the client directory:
   ```bash
   cd client
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

   You should see the dashboard with 4 seat cards, all showing "Open" initially.

## Usage

### Normal Operation

1. Make sure both the backend server and frontend are running
2. Press a button on the Arduino
3. The corresponding LED should light up (or turn off if already on)
4. The dashboard should immediately update to show that seat as "Taken" or "Open"

### Testing Without Hardware

You can test the system without the Arduino by using the manual toggle buttons on each seat card in the web dashboard. Click "Mark as Taken" or "Mark as Open" to simulate button presses.

### Serial Protocol

The Arduino sends JSON messages over Serial at 9600 baud:

**Seat state update:**
```json
{"seatId": 2, "occupied": true}
```

**Initial state (on startup):**
The Arduino sends one message per seat on startup, all set to `false`:
```json
{"seatId":1,"occupied":false}
{"seatId":2,"occupied":false}
{"seatId":3,"occupied":false}
{"seatId":4,"occupied":false}
```

**RESET command (optional):**
You can send `RESET\n` to the Arduino over Serial to clear all seats and turn off all LEDs.

## Project Structure

```
SMOOSHButtonApp/
├── firmware/
│   └── smoosh_button.ino      # Arduino sketch
├── server/
│   ├── src/
│   │   └── index.ts            # Backend server code
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example            # Environment variables template
├── client/
│   ├── src/
│   │   ├── App.tsx             # Main React component
│   │   ├── components/
│   │   │   └── SeatCard.tsx    # Individual seat card component
│   │   └── main.tsx            # React entry point
│   ├── package.json
│   └── vite.config.ts          # Vite configuration
└── README.md                    # This file
```

## Troubleshooting

### Arduino Not Detected

- **Check USB connection**: Ensure the Arduino is properly connected via USB
- **Check port**: Verify the port in Device Manager (Windows) or `ls /dev/tty*` (macOS/Linux)
- **Close Serial Monitor**: Make sure the Arduino IDE Serial Monitor is closed (it locks the port)
- **Close other programs**: Ensure no other program is using the serial port

### Backend Can't Connect to Arduino

- **Check `.env` file**: Make sure `ARDUINO_PORT` matches your actual port
- **Check permissions** (Linux/macOS): You may need to add your user to the `dialout` group:
  ```bash
  sudo usermod -a -G dialout $USER
  ```
  Then log out and log back in.

### Frontend Shows "Disconnected"

- **Check backend**: Make sure the backend server is running on port 3001
- **Check browser console**: Open Developer Tools (F12) and look for errors
- **Check CORS**: The backend should allow connections from `http://localhost:5173`

### Buttons Not Working

- **Check wiring**: Verify buttons are connected correctly (one side to pin, other to GND)
- **Check Serial Monitor**: Open Arduino IDE Serial Monitor to see if messages are being sent
- **Check debouncing**: The firmware uses 50ms debounce delay - try pressing and holding for a moment

### LEDs Not Working

- **Check wiring**: Verify LEDs are connected with correct polarity (anode to pin, cathode to GND)
- **Check resistors**: Ensure appropriate resistors are used (220Ω-1kΩ typically)
- **Check Serial Monitor**: Verify the Arduino is sending messages when buttons are pressed

## Development Notes

### Backend API Endpoints

- `GET /api/seats` - Returns current state of all seats
- `POST /api/seats/:id/override` - Manually toggle a seat (for testing)

### WebSocket Events

- `initialState` - Sent to newly connected clients with all seat states
- `seatUpdate` - Broadcast when any seat state changes

### Modifying the Code

- **Change number of seats**: Update `NUM_SEATS` in `firmware/smoosh_button.ino`, and the `seats` array in `server/src/index.ts`
- **Change pin assignments**: Update the `BUTTON_PINS` and `LED_PINS` arrays in the Arduino sketch
- **Change baud rate**: Update `SERIAL_BAUD_RATE` in both Arduino sketch and backend server

## For Beginners

### Key Concepts

- **Serial Communication**: The Arduino and computer communicate via USB Serial at 9600 baud
- **Debouncing**: Prevents false button presses from electrical noise by waiting 50ms after a state change
- **WebSocket**: Allows real-time bidirectional communication between browser and server
- **State Management**: The backend maintains the "source of truth" for seat states

### Code Comments

All code includes comments explaining:
- What each section does
- Why certain design decisions were made
- How the hardware and software interact
