/*
 * SMOOSH - Library Button Firmware
 * 
 * Hardware Configuration:
 * - 4 buttons on digital pins 2, 3, 4, 5 (using INPUT_PULLUP)
 * - 4 LEDs on pins 6, 7, 8, 9 (active HIGH)
 * - Serial communication at 9600 baud
 * 
 * Behavior:
 * - On startup, sends initial state for all seats (all unoccupied)
 * - Monitors button presses with debouncing
 * - When a button is pressed, toggles the seat's occupied state
 * - Updates the corresponding LED and sends JSON message over Serial
 * - Supports RESET command from PC to clear all seats
 */

// Pin definitions
const int NUM_SEATS = 4;
const int BUTTON_PINS[NUM_SEATS] = {2, 3, 4, 5};
const int LED_PINS[NUM_SEATS] = {6, 7, 8, 9};

// Seat state: true = occupied, false = open
bool seatOccupied[NUM_SEATS] = {false, false, false, false};

// Button debouncing variables
unsigned long lastDebounceTime[NUM_SEATS] = {0, 0, 0, 0};
const unsigned long DEBOUNCE_DELAY = 50; // milliseconds
int lastButtonState[NUM_SEATS] = {HIGH, HIGH, HIGH, HIGH}; // HIGH = not pressed (pullup)
int buttonState[NUM_SEATS] = {HIGH, HIGH, HIGH, HIGH};

// Serial input buffer for RESET command
String serialInput = "";

void setup() {
  // Initialize Serial communication at 9600 baud
  Serial.begin(9600);
  
  // Initialize button pins (INPUT_PULLUP means button press = LOW)
  for (int i = 0; i < NUM_SEATS; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }
  
  // Initialize LED pins as outputs
  for (int i = 0; i < NUM_SEATS; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW); // Start with all LEDs off
  }
  
  // Send initial state for all seats (all unoccupied)
  // This helps the backend sync on startup
  for (int i = 0; i < NUM_SEATS; i++) {
    sendSeatUpdate(i + 1, false); // Seat IDs are 1-indexed
  }
  
  // Small delay to ensure Serial is ready
  delay(100);
}

void loop() {
  // Check for incoming Serial commands (like RESET)
  checkSerialCommands();
  
  // Check each button for state changes
  for (int i = 0; i < NUM_SEATS; i++) {
    checkButton(i);
  }
}

/*
 * Checks if a button has been pressed and handles debouncing.
 * When a button press is detected, toggles the seat state.
 */
void checkButton(int seatIndex) {
  // Read current button state
  int reading = digitalRead(BUTTON_PINS[seatIndex]);
  
  // If button state changed (due to noise or actual press)
  if (reading != lastButtonState[seatIndex]) {
    // Reset the debounce timer
    lastDebounceTime[seatIndex] = millis();
  }
  
  // If enough time has passed since last state change
  if ((millis() - lastDebounceTime[seatIndex]) > DEBOUNCE_DELAY) {
    // If button state is different from the stable state
    if (reading != buttonState[seatIndex]) {
      buttonState[seatIndex] = reading;
      
      // Button press detected (LOW because of INPUT_PULLUP)
      if (buttonState[seatIndex] == LOW) {
        // Toggle the seat's occupied state
        seatOccupied[seatIndex] = !seatOccupied[seatIndex];
        
        // Update LED to match seat state
        digitalWrite(LED_PINS[seatIndex], seatOccupied[seatIndex] ? HIGH : LOW);
        
        // Send update over Serial
        sendSeatUpdate(seatIndex + 1, seatOccupied[seatIndex]); // Seat IDs are 1-indexed
      }
    }
  }
  
  // Save current reading for next loop iteration
  lastButtonState[seatIndex] = reading;
}

/*
 * Sends a JSON-formatted message over Serial when a seat state changes.
 * Format: {"seatId": 1, "occupied": true}
 */
void sendSeatUpdate(int seatId, bool occupied) {
  Serial.print("{\"seatId\":");
  Serial.print(seatId);
  Serial.print(",\"occupied\":");
  Serial.print(occupied ? "true" : "false");
  Serial.println("}");
}

/*
 * Checks for incoming Serial commands from the PC.
 * Supports:
 * - RESET: clears all seats and turns off all LEDs
 * - JSON messages: {"seatId": 2, "occupied": true} - updates a specific seat
 */
void checkSerialCommands() {
  // Read available characters from Serial
  while (Serial.available() > 0) {
    char inChar = Serial.read();
    
    // If newline received, process the command
    if (inChar == '\n') {
      serialInput.trim(); // Remove whitespace
      
      // Handle RESET command
      if (serialInput == "RESET") {
        // Clear all seats
        for (int i = 0; i < NUM_SEATS; i++) {
          seatOccupied[i] = false;
          digitalWrite(LED_PINS[i], LOW);
          sendSeatUpdate(i + 1, false);
        }
      } 
      // Try to parse as JSON seat update
      else if (serialInput.startsWith("{\"seatId\"")) {
        // Simple JSON parsing for {"seatId": X, "occupied": true/false}
        // This is a basic parser - for production, consider a proper JSON library
        int seatIdStart = serialInput.indexOf("\"seatId\":") + 9;
        int seatIdEnd = serialInput.indexOf(',', seatIdStart);
        if (seatIdEnd == -1) seatIdEnd = serialInput.indexOf('}', seatIdStart);
        
        int occupiedStart = serialInput.indexOf("\"occupied\":") + 11;
        int occupiedEnd = serialInput.indexOf('}', occupiedStart);
        
        if (seatIdStart > 8 && occupiedStart > 10) {
          int seatId = serialInput.substring(seatIdStart, seatIdEnd).toInt();
          String occupiedStr = serialInput.substring(occupiedStart, occupiedEnd);
          bool occupied = (occupiedStr == "true");
          
          // Validate seat ID (1-4)
          if (seatId >= 1 && seatId <= NUM_SEATS) {
            int seatIndex = seatId - 1;
            seatOccupied[seatIndex] = occupied;
            digitalWrite(LED_PINS[seatIndex], occupied ? HIGH : LOW);
            // Don't echo back - the PC already knows the state
          }
        }
      }
      
      // Clear the input buffer
      serialInput = "";
    } else {
      // Accumulate characters
      serialInput += inChar;
    }
  }
}

