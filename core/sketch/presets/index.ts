/**
 * Preset project definitions — bundled example sketches with matching wiring configurations.
 */

import type { ProjectData, ProjectDataV2, SavedEditorWire } from '../../simulation/ProjectSerializer';

// Standard power/motor wires for presets with battery + driver + 2 DC motors
const STANDARD_MOTOR_WIRES: SavedEditorWire[] = [
    { fromComponentId: 'battery', fromPinName: 'V_OUT', toComponentId: 'driver', toPinName: 'VCC' },
    { fromComponentId: 'driver', fromPinName: 'OUT_A', toComponentId: 'motor-left', toPinName: 'POWER' },
    { fromComponentId: 'driver', fromPinName: 'OUT_B', toComponentId: 'motor-right', toPinName: 'POWER' },
];

// Battery → MCU VIN (for presets without a motor driver)
const BATTERY_TO_MCU_WIRE: SavedEditorWire[] = [
    { fromComponentId: 'battery', fromPinName: 'V_OUT', toComponentId: '__mcu__', toPinName: 'VIN' },
];

// Reusable boundary walls for a 2m×2m arena
const ARENA_WALLS = [
    { id: 'wall-n', x1: -1, z1: -1, x2: 1, z2: -1, thickness: 0.02, label: 'North Wall' },
    { id: 'wall-s', x1: -1, z1: 1, x2: 1, z2: 1, thickness: 0.02, label: 'South Wall' },
    { id: 'wall-e', x1: 1, z1: -1, x2: 1, z2: 1, thickness: 0.02, label: 'East Wall' },
    { id: 'wall-w', x1: -1, z1: -1, x2: -1, z2: 1, thickness: 0.02, label: 'West Wall' },
];

const BLINK: ProjectDataV2 = {
    version: 2,
    name: 'Blink LED',
    sketch: `// Blink — Classic Arduino example
// Toggles the built-in LED (pin 13) on and off

void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink started!");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
`,
    components: [
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [...BATTERY_TO_MCU_WIRE],
};

const MOTOR_DRIVE: ProjectDataV2 = {
    version: 2,
    name: 'Motor Drive — Forward & Pivot',
    sketch: `// Motor Drive — moves forward, stops, pivots, and repeats
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define MOTOR_SPEED 200

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
}

void driveForward() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, MOTOR_SPEED);
  analogWrite(ENB_PIN, MOTOR_SPEED);
}

void stopMotors() {
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
}

void pivotLeft() {
  digitalWrite(IN1_PIN, LOW);
  digitalWrite(IN2_PIN, HIGH);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, MOTOR_SPEED);
  analogWrite(ENB_PIN, MOTOR_SPEED);
}

void loop() {
  Serial.println("Forward!");
  driveForward();
  delay(2000);
  Serial.println("Stop");
  stopMotors();
  delay(1000);
  Serial.println("Pivot left");
  pivotLeft();
  delay(2000);
  Serial.println("Stop");
  stopMotors();
  delay(1000);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
    ],
    obstacles: [
        { x: 0.5, z: 0.2, radius: 0.06 },
        { x: 0.3, z: -0.3, radius: 0.05 },
    ],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [
        { id: 'arena-floor', shape: 'rect' as const, x: 0, z: 0, width: 2, height: 2, friction: 0.8, label: 'Concrete', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const OBSTACLE_AVOIDER: ProjectDataV2 = {
    version: 2,
    name: 'Obstacle Avoider',
    sketch: `// Obstacle Avoider — uses ultrasonic sensor to detect and avoid obstacles
#define TRIG_PIN 4
#define ECHO_PIN 2
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define SAFE_DISTANCE 20

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Obstacle Avoider ready!");
}

void driveForward() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, 180);
  analogWrite(ENB_PIN, 180);
}

void turnRight() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, 150);
  analogWrite(ENB_PIN, 150);
}

void stopMotors() {
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;
}

void loop() {
  int distance = getDistance();
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance > 0 && distance < SAFE_DISTANCE) {
    Serial.println("Obstacle detected! Turning...");
    stopMotors();
    delay(200);
    turnRight();
    delay(800);
  } else {
    driveForward();
  }
  delay(100);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
        { type: 'hc-sr04', id: 'ultrasonic' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 4, componentId: 'ultrasonic', componentPinName: 'TRIG' },
        { mcuPinIndex: 2, componentId: 'ultrasonic', componentPinName: 'ECHO' },
    ],
    obstacles: [
        { x: 0.4, z: 0, radius: 0.06 },
        { x: 0.6, z: 0.25, radius: 0.05 },
        { x: 0.2, z: -0.3, radius: 0.07 },
        { x: 0.7, z: -0.15, radius: 0.05 },
        { x: 0.5, z: 0.45, radius: 0.06 },
        { x: 0.15, z: 0.35, radius: 0.04 },
        { x: 0.8, z: 0.1, radius: 0.05 },
        { x: 0.35, z: -0.5, radius: 0.06 },
    ],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [
        { id: 'arena-floor', shape: 'rect' as const, x: 0, z: 0, width: 2, height: 2, friction: 0.8, label: 'Concrete', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const LINE_FOLLOWER: ProjectDataV2 = {
    version: 2,
    name: 'Line Follower',
    sketch: `// Line Follower — uses two IR sensors to follow a black line
#define IR_LEFT A0
#define IR_RIGHT A1
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define BASE_SPEED 180

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Line Follower ready!");
}

void loop() {
  int left = digitalRead(IR_LEFT);
  int right = digitalRead(IR_RIGHT);

  if (left == 0 && right == 0) {
    // Both on line — go straight
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
    analogWrite(ENA_PIN, BASE_SPEED);
    analogWrite(ENB_PIN, BASE_SPEED);
  } else if (left == 0 && right == 1) {
    // Left on line — turn left
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
    analogWrite(ENA_PIN, BASE_SPEED / 2);
    analogWrite(ENB_PIN, BASE_SPEED);
  } else if (left == 1 && right == 0) {
    // Right on line — turn right
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
    analogWrite(ENA_PIN, BASE_SPEED);
    analogWrite(ENB_PIN, BASE_SPEED / 2);
  } else {
    // Both off line — stop
    analogWrite(ENA_PIN, 0);
    analogWrite(ENB_PIN, 0);
  }
  delay(50);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
        { type: 'ir-line', id: 'ir-left' },
        { type: 'ir-line', id: 'ir-right' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 14, componentId: 'ir-left', componentPinName: 'OUT' },
        { mcuPinIndex: 15, componentId: 'ir-right', componentPinName: 'OUT' },
    ],
    obstacles: [],
    lineTrack: {
        points: [
            { x: 0, z: 0 },
            { x: 0.5, z: 0 },
            { x: 0.7, z: 0.2 },
            { x: 0.7, z: 0.5 },
            { x: 0.5, z: 0.7 },
            { x: 0.2, z: 0.7 },
            { x: 0, z: 0.5 },
            { x: 0, z: 0.2 },
            { x: 0, z: 0 },
        ],
        lineWidth: 0.02,
    },
    frictionZones: [
        { id: 'carpet-track', shape: 'rect' as const, x: 0.35, z: 0.35, width: 0.9, height: 0.9, friction: 1.2, label: 'Carpet', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const REMOTE_CONTROL: ProjectDataV2 = {
    version: 2,
    name: 'Remote Control — Serial Commands',
    sketch: `// Remote Control — drive the car via Serial commands
// Send: F (forward), B (backward), L (left), R (right), S (stop)
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define SPEED 200

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Remote Control ready!");
  Serial.println("Commands: F B L R S");
}

void forward() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED);
}

void backward() {
  digitalWrite(IN1_PIN, LOW);
  digitalWrite(IN2_PIN, HIGH);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED);
}

void turnLeft() {
  digitalWrite(IN1_PIN, LOW);
  digitalWrite(IN2_PIN, HIGH);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED);
}

void turnRight() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED);
}

void stopMotors() {
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
}

void loop() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    switch (cmd) {
      case 'F': case 'f':
        Serial.println(">> Forward");
        forward();
        break;
      case 'B': case 'b':
        Serial.println(">> Backward");
        backward();
        break;
      case 'L': case 'l':
        Serial.println(">> Turn Left");
        turnLeft();
        break;
      case 'R': case 'r':
        Serial.println(">> Turn Right");
        turnRight();
        break;
      case 'S': case 's':
        Serial.println(">> Stop");
        stopMotors();
        break;
      default:
        Serial.print("Unknown: ");
        Serial.println(cmd);
        break;
    }
  }
  delay(50);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const STEPPER_CONTROL: ProjectDataV2 = {
    version: 2,
    name: 'Stepper Motor Control',
    sketch: `// Stepper Motor Control — NEMA 17 + A4988, 200 steps forward, 1s wait, 200 steps back
#define STEP_PIN 3
#define DIR_PIN 4
#define ENABLE_PIN 5

void setup() {
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  digitalWrite(ENABLE_PIN, LOW);
  Serial.begin(9600);
  Serial.println("Stepper Control ready!");
}

void loop() {
  digitalWrite(DIR_PIN, HIGH);
  for (int i = 0; i < 200; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(500);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(500);
  }
  delay(1000);
  digitalWrite(DIR_PIN, LOW);
  for (int i = 0; i < 200; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(500);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(500);
  }
  delay(1000);
}
`,
    components: [
        { type: 'stepper:nema17-12v', id: 'stepper' },
        { type: 'a4988', id: 'driver' },
        { type: 'battery', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 3, componentId: 'driver', componentPinName: 'STEP' },
        { mcuPinIndex: 4, componentId: 'driver', componentPinName: 'DIR' },
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENABLE' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [{ fromComponentId: 'battery', fromPinName: 'V_OUT', toComponentId: 'driver', toPinName: 'VCC' }],
};

const LIGHT_FOLLOWER: ProjectDataV2 = {
    version: 2,
    name: 'Light-Following Robot',
    sketch: `// Light-Following Robot — reads 2 LDR sensors, turns toward brighter side
#define LDR_LEFT A0
#define LDR_RIGHT A1
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define BASE_SPEED 180

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Light Follower ready!");
}

void loop() {
  int left = analogRead(LDR_LEFT);
  int right = analogRead(LDR_RIGHT);

  if (left > right + 50) {
    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, HIGH);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
    analogWrite(ENA_PIN, BASE_SPEED);
    analogWrite(ENB_PIN, BASE_SPEED);
  } else if (right > left + 50) {
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, LOW);
    digitalWrite(IN4_PIN, HIGH);
    analogWrite(ENA_PIN, BASE_SPEED);
    analogWrite(ENB_PIN, BASE_SPEED);
  } else {
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    digitalWrite(IN3_PIN, HIGH);
    digitalWrite(IN4_PIN, LOW);
    analogWrite(ENA_PIN, BASE_SPEED);
    analogWrite(ENB_PIN, BASE_SPEED);
  }
  delay(50);
}
`,
    components: [
        { type: 'ldr', id: 'ldr-left' },
        { type: 'ldr', id: 'ldr-right' },
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 14, componentId: 'ldr-left', componentPinName: 'OUT' },
        { mcuPinIndex: 15, componentId: 'ldr-right', componentPinName: 'OUT' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const TEMP_LOGGER: ProjectDataV2 = {
    version: 2,
    name: 'Temperature Logger',
    sketch: `// Temperature Logger — DHT11 reads temperature via digital pin
// In real hardware you would use the DHT library; here the simulator
// exposes the sensor value on the DATA pin as a digital read.
#define DHT_PIN 2

int readCount = 0;

void setup() {
  pinMode(DHT_PIN, INPUT);
  Serial.begin(9600);
  Serial.println("Temperature Logger ready!");
  Serial.println("Reading DHT11 every 2 seconds...");
}

void loop() {
  // The simulator bridges DHT11 temperature to the DATA pin value
  int raw = digitalRead(DHT_PIN);
  // Map the simulated value to a realistic temperature range (20-30 C)
  float temp = 20.0 + raw * 10.0;
  readCount = readCount + 1;

  Serial.print("[");
  Serial.print(readCount);
  Serial.print("] Temperature: ");
  Serial.print(temp);
  Serial.println(" C");

  if (temp > 28) {
    Serial.println("  WARNING: High temperature!");
  }

  delay(2000);
}
`,
    components: [
        { type: 'dht11', id: 'dht11' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 2, componentId: 'dht11', componentPinName: 'DATA' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [...BATTERY_TO_MCU_WIRE],
};

const MAZE_SOLVER: ProjectDataV2 = {
    version: 2,
    name: 'Wall-Following Maze Solver',
    sketch: `// Wall-Following Maze Solver — HC-SR04 reads distance, turn if <20cm
#define TRIG_PIN 12
#define ECHO_PIN 11
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define SAFE_DISTANCE 20

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Maze Solver ready!");
}

void driveForward() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, 180);
  analogWrite(ENB_PIN, 180);
}

void turnRight() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, 150);
  analogWrite(ENB_PIN, 150);
}

void stopMotors() {
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;
}

void loop() {
  int distance = getDistance();
  Serial.print("Distance: ");
  Serial.println(distance);

  if (distance < SAFE_DISTANCE) {
    stopMotors();
    delay(200);
    turnRight();
    delay(800);
  } else {
    driveForward();
  }
  delay(100);
}
`,
    components: [
        { type: 'hc-sr04', id: 'ultrasonic' },
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 12, componentId: 'ultrasonic', componentPinName: 'TRIG' },
        { mcuPinIndex: 11, componentId: 'ultrasonic', componentPinName: 'ECHO' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [
        { id: 'maze-floor', shape: 'rect' as const, x: 0.4, z: 0.35, width: 1.2, height: 1.0, friction: 0.8, label: 'Concrete', priority: 0 },
    ],
    walls: [
        // Outer boundary
        { id: 'maze-n', x1: -0.1, z1: -0.2, x2: 0.9, z2: -0.2, thickness: 0.015, label: 'N' },
        { id: 'maze-s', x1: -0.1, z1: 0.9, x2: 0.9, z2: 0.9, thickness: 0.015, label: 'S' },
        { id: 'maze-w', x1: -0.1, z1: -0.2, x2: -0.1, z2: 0.9, thickness: 0.015, label: 'W' },
        { id: 'maze-e', x1: 0.9, z1: -0.2, x2: 0.9, z2: 0.9, thickness: 0.015, label: 'E' },
        // Interior maze walls
        { id: 'mw-1', x1: 0.1, z1: 0, x2: 0.1, z2: 0.4, thickness: 0.012, label: '' },
        { id: 'mw-2', x1: 0.3, z1: -0.1, x2: 0.3, z2: 0.2, thickness: 0.012, label: '' },
        { id: 'mw-3', x1: 0.3, z1: 0.4, x2: 0.3, z2: 0.7, thickness: 0.012, label: '' },
        { id: 'mw-4', x1: 0.5, z1: 0.1, x2: 0.5, z2: 0.5, thickness: 0.012, label: '' },
        { id: 'mw-5', x1: 0.1, z1: 0.6, x2: 0.5, z2: 0.6, thickness: 0.012, label: '' },
        { id: 'mw-6', x1: 0.5, z1: 0.6, x2: 0.7, z2: 0.6, thickness: 0.012, label: '' },
        { id: 'mw-7', x1: 0.7, z1: 0, x2: 0.7, z2: 0.4, thickness: 0.012, label: '' },
        { id: 'mw-8', x1: 0.5, z1: -0.1, x2: 0.7, z2: -0.1, thickness: 0.012, label: '' },
    ],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const ENCODER_PID: ProjectDataV2 = {
    version: 2,
    name: 'Encoder PID — Speed Control',
    sketch: `// Encoder PID — proportional speed control using wheel encoders
// Encoders output pulse rate proportional to wheel speed.
// The simulator bridges encoder SPEED output to the connected analog pins.
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define ENC_LEFT_PIN A0
#define ENC_RIGHT_PIN A1
#define TARGET_SPEED 150
#define KP 2

int pwmLeft = 180;
int pwmRight = 180;

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Encoder PID — Speed Control");
  Serial.println("Target speed: 150");

  // Forward direction
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
}

void loop() {
  // Read encoder speed (simulator maps wheel angular velocity to analog value)
  int encLeft = analogRead(ENC_LEFT_PIN);
  int encRight = analogRead(ENC_RIGHT_PIN);

  int measuredLeft = map(encLeft, 0, 1023, 0, 255);
  int measuredRight = map(encRight, 0, 1023, 0, 255);

  // Proportional correction: adjust PWM to match target speed
  int errorLeft = TARGET_SPEED - measuredLeft;
  int errorRight = TARGET_SPEED - measuredRight;

  pwmLeft = pwmLeft + KP * errorLeft;
  pwmRight = pwmRight + KP * errorRight;

  // Clamp PWM to valid range
  if (pwmLeft > 255) { pwmLeft = 255; }
  if (pwmLeft < 0) { pwmLeft = 0; }
  if (pwmRight > 255) { pwmRight = 255; }
  if (pwmRight < 0) { pwmRight = 0; }

  analogWrite(ENA_PIN, pwmLeft);
  analogWrite(ENB_PIN, pwmRight);

  Serial.print("Enc L:");
  Serial.print(measuredLeft);
  Serial.print(" R:");
  Serial.print(measuredRight);
  Serial.print(" | PWM L:");
  Serial.print(pwmLeft);
  Serial.print(" R:");
  Serial.println(pwmRight);

  delay(50);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
        { type: 'encoder', id: 'encoder-left' },
        { type: 'encoder', id: 'encoder-right' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 14, componentId: 'encoder-left', componentPinName: 'SPEED' },
        { mcuPinIndex: 15, componentId: 'encoder-right', componentPinName: 'SPEED' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
    frictionZones: [],
    walls: [],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

// ── New fun presets with rich environments ──────────────────

const SLALOM_COURSE: ProjectDataV2 = {
    version: 2,
    name: 'Slalom Course',
    sketch: `// Slalom Course — weave between cones with timed turns
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define SPEED 180

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Slalom Course — GO!");
}

void forward() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED);
}

void turnLeft() {
  analogWrite(ENA_PIN, SPEED / 3);
  analogWrite(ENB_PIN, SPEED);
}

void turnRight() {
  analogWrite(ENA_PIN, SPEED);
  analogWrite(ENB_PIN, SPEED / 3);
}

void loop() {
  Serial.println("Forward");
  forward();
  delay(1200);
  Serial.println("Swerve left");
  turnLeft();
  delay(700);
  Serial.println("Forward");
  forward();
  delay(1200);
  Serial.println("Swerve right");
  turnRight();
  delay(700);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
    ],
    obstacles: [
        { x: 0.25, z: 0.12, radius: 0.04 },
        { x: 0.45, z: -0.1, radius: 0.04 },
        { x: 0.65, z: 0.12, radius: 0.04 },
        { x: 0.85, z: -0.1, radius: 0.04 },
        { x: 1.05, z: 0.12, radius: 0.04 },
        { x: 1.25, z: -0.1, radius: 0.04 },
    ],
    lineTrack: { points: [], lineWidth: 0 },
    frictionZones: [
        { id: 'slalom-floor', shape: 'rect' as const, x: 0.6, z: 0, width: 1.6, height: 0.6, friction: 0.8, label: 'Concrete', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const ICE_RINK_DRIFT: ProjectDataV2 = {
    version: 2,
    name: 'Ice Rink Drift',
    sketch: `// Ice Rink Drift — drive in circles on slippery ice
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Ice Rink — watch the drift!");
}

void loop() {
  // Drive in a wide arc — differential speed
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, 255);
  analogWrite(ENB_PIN, 120);
  Serial.println("Drifting...");
  delay(3000);

  // Reverse arc
  analogWrite(ENA_PIN, 120);
  analogWrite(ENB_PIN, 255);
  Serial.println("Reverse arc");
  delay(3000);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
    ],
    obstacles: [
        { x: 0.4, z: 0, radius: 0.06 },
    ],
    lineTrack: { points: [], lineWidth: 0 },
    frictionZones: [
        { id: 'ice-rink', shape: 'rect' as const, x: 0, z: 0, width: 2, height: 2, friction: 0.05, label: 'Ice', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const HILL_CLIMB: ProjectDataV2 = {
    version: 2,
    name: 'Hill Climb',
    sketch: `// Hill Climb — full power up progressive ramps
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10

void setup() {
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Hill Climb — full throttle!");
}

void loop() {
  // Full forward
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, 255);
  analogWrite(ENB_PIN, 255);
  Serial.println("Climbing...");
  delay(5000);

  // Stop and reverse
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
  delay(1000);
  Serial.println("Reversing");
  digitalWrite(IN1_PIN, LOW);
  digitalWrite(IN2_PIN, HIGH);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, 200);
  analogWrite(ENB_PIN, 200);
  delay(3000);
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
  delay(1000);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
    ],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0 },
    frictionZones: [
        { id: 'road', shape: 'rect' as const, x: 0.5, z: 0, width: 1.5, height: 0.5, friction: 0.8, label: 'Road', priority: 0 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [
        { id: 'ramp-5', shape: 'ramp' as const, x: 0.3, z: 0, width: 0.25, depth: 0.4, slopeDirection: 0, elevationDelta: 0.02, label: '5° ramp' },
        { id: 'ramp-10', shape: 'ramp' as const, x: 0.6, z: 0, width: 0.25, depth: 0.4, slopeDirection: 0, elevationDelta: 0.045, label: '10° ramp' },
        { id: 'ramp-15', shape: 'ramp' as const, x: 0.9, z: 0, width: 0.25, depth: 0.4, slopeDirection: 0, elevationDelta: 0.07, label: '15° ramp' },
    ],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const SUMO_BOT: ProjectDataV2 = {
    version: 2,
    name: 'Sumo Bot',
    sketch: `// Sumo Bot — spin and charge when opponent detected
#define TRIG_PIN 4
#define ECHO_PIN 2
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define ATTACK_DISTANCE 30
#define SPIN_SPEED 200
#define CHARGE_SPEED 255

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("SUMO BOT — Ready to fight!");
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;
}

void spinSearch() {
  // Spin in place: left wheel forward, right wheel backward
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, SPIN_SPEED);
  analogWrite(ENB_PIN, SPIN_SPEED);
}

void chargeForward() {
  // Full speed ahead
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, CHARGE_SPEED);
  analogWrite(ENB_PIN, CHARGE_SPEED);
}

void loop() {
  int distance = getDistance();
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance > 0 && distance < ATTACK_DISTANCE) {
    Serial.println("TARGET ACQUIRED — CHARGE!");
    chargeForward();
    delay(600);
  } else {
    Serial.println("Scanning...");
    spinSearch();
    delay(250);
  }
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
        { type: 'hc-sr04', id: 'ultrasonic' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 4, componentId: 'ultrasonic', componentPinName: 'TRIG' },
        { mcuPinIndex: 2, componentId: 'ultrasonic', componentPinName: 'ECHO' },
    ],
    obstacles: [
        { x: 0.5, z: 0.2, radius: 0.08 },
    ],
    lineTrack: { points: [], lineWidth: 0 },
    frictionZones: [
        { id: 'sumo-center', shape: 'circle' as const, x: 0.3, z: 0, radius: 0.5, friction: 0.8, label: 'Sumo Ring', priority: 0 },
    ],
    walls: [
        // Octagonal ring
        { id: 'oct-1', x1: 0.8, z1: -0.2, x2: 0.5, z2: -0.5, thickness: 0.02, label: '' },
        { id: 'oct-2', x1: 0.5, z1: -0.5, x2: 0.1, z2: -0.5, thickness: 0.02, label: '' },
        { id: 'oct-3', x1: 0.1, z1: -0.5, x2: -0.2, z2: -0.2, thickness: 0.02, label: '' },
        { id: 'oct-4', x1: -0.2, z1: -0.2, x2: -0.2, z2: 0.2, thickness: 0.02, label: '' },
        { id: 'oct-5', x1: -0.2, z1: 0.2, x2: 0.1, z2: 0.5, thickness: 0.02, label: '' },
        { id: 'oct-6', x1: 0.1, z1: 0.5, x2: 0.5, z2: 0.5, thickness: 0.02, label: '' },
        { id: 'oct-7', x1: 0.5, z1: 0.5, x2: 0.8, z2: 0.2, thickness: 0.02, label: '' },
        { id: 'oct-8', x1: 0.8, z1: 0.2, x2: 0.8, z2: -0.2, thickness: 0.02, label: '' },
    ],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

const SENSOR_PLAYGROUND: ProjectDataV2 = {
    version: 2,
    name: 'Sensor Playground',
    sketch: `// Sensor Playground — explore mixed terrain with ultrasonic + IR sensors
// Combines obstacle avoidance with line detection
#define TRIG_PIN 4
#define ECHO_PIN 2
#define IR_LEFT_PIN A0
#define IR_RIGHT_PIN A1
#define ENA_PIN 5
#define ENB_PIN 6
#define IN1_PIN 7
#define IN2_PIN 8
#define IN3_PIN 9
#define IN4_PIN 10
#define SAFE_DIST 25
#define BASE_SPEED 180

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(ENA_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT);
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  pinMode(IN3_PIN, OUTPUT);
  pinMode(IN4_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Sensor Playground — multi-sensor exploration");
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.034 / 2;
}

void forward(int spd) {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, spd);
  analogWrite(ENB_PIN, spd);
}

void turnLeft() {
  digitalWrite(IN1_PIN, LOW);
  digitalWrite(IN2_PIN, HIGH);
  digitalWrite(IN3_PIN, HIGH);
  digitalWrite(IN4_PIN, LOW);
  analogWrite(ENA_PIN, 150);
  analogWrite(ENB_PIN, 150);
}

void turnRight() {
  digitalWrite(IN1_PIN, HIGH);
  digitalWrite(IN2_PIN, LOW);
  digitalWrite(IN3_PIN, LOW);
  digitalWrite(IN4_PIN, HIGH);
  analogWrite(ENA_PIN, 150);
  analogWrite(ENB_PIN, 150);
}

void stopMotors() {
  analogWrite(ENA_PIN, 0);
  analogWrite(ENB_PIN, 0);
}

void loop() {
  int distance = getDistance();
  int irLeft = digitalRead(IR_LEFT_PIN);
  int irRight = digitalRead(IR_RIGHT_PIN);

  Serial.print("Dist:");
  Serial.print(distance);
  Serial.print("cm  IR L:");
  Serial.print(irLeft);
  Serial.print(" R:");
  Serial.println(irRight);

  // Priority 1: obstacle avoidance
  if (distance > 0 && distance < SAFE_DIST) {
    Serial.println("  -> Obstacle! Evading...");
    stopMotors();
    delay(200);
    turnLeft();
    delay(600);
  }
  // Priority 2: line following when IR detects line
  else if (irLeft == 0 && irRight == 0) {
    forward(BASE_SPEED);
  } else if (irLeft == 0 && irRight == 1) {
    Serial.println("  -> Line left, adjusting");
    turnLeft();
    delay(100);
  } else if (irLeft == 1 && irRight == 0) {
    Serial.println("  -> Line right, adjusting");
    turnRight();
    delay(100);
  } else {
    forward(BASE_SPEED);
  }
  delay(60);
}
`,
    components: [
        { type: 'l298n', id: 'driver' },
        { type: 'dc-motor', id: 'motor-left' },
        { type: 'dc-motor', id: 'motor-right' },
        { type: 'battery-4aa', id: 'battery' },
        { type: 'hc-sr04', id: 'ultrasonic' },
        { type: 'ir-line', id: 'ir-left' },
        { type: 'ir-line', id: 'ir-right' },
    ],
    wires: [
        { mcuPinIndex: 5, componentId: 'driver', componentPinName: 'ENA' },
        { mcuPinIndex: 6, componentId: 'driver', componentPinName: 'ENB' },
        { mcuPinIndex: 7, componentId: 'driver', componentPinName: 'IN1' },
        { mcuPinIndex: 8, componentId: 'driver', componentPinName: 'IN2' },
        { mcuPinIndex: 9, componentId: 'driver', componentPinName: 'IN3' },
        { mcuPinIndex: 10, componentId: 'driver', componentPinName: 'IN4' },
        { mcuPinIndex: 4, componentId: 'ultrasonic', componentPinName: 'TRIG' },
        { mcuPinIndex: 2, componentId: 'ultrasonic', componentPinName: 'ECHO' },
        { mcuPinIndex: 14, componentId: 'ir-left', componentPinName: 'OUT' },
        { mcuPinIndex: 15, componentId: 'ir-right', componentPinName: 'OUT' },
    ],
    obstacles: [
        { x: 0.5, z: 0.15, radius: 0.05 },
        { x: 0.3, z: -0.25, radius: 0.06 },
        { x: 0.7, z: -0.1, radius: 0.04 },
        { x: 0.15, z: 0.35, radius: 0.05 },
    ],
    lineTrack: {
        points: [
            { x: 0, z: 0 },
            { x: 0.3, z: 0 },
            { x: 0.5, z: 0.1 },
            { x: 0.7, z: 0 },
            { x: 0.9, z: 0 },
        ],
        lineWidth: 0.02,
    },
    frictionZones: [
        { id: 'concrete-patch', shape: 'rect' as const, x: 0, z: 0, width: 0.5, height: 0.5, friction: 0.8, label: 'Concrete', priority: 0 },
        { id: 'ice-patch', shape: 'rect' as const, x: 0.5, z: -0.3, width: 0.4, height: 0.4, friction: 0.05, label: 'Ice', priority: 1 },
        { id: 'carpet-patch', shape: 'rect' as const, x: 0.3, z: 0.3, width: 0.4, height: 0.4, friction: 1.2, label: 'Carpet', priority: 1 },
        { id: 'sand-patch', shape: 'rect' as const, x: 0.7, z: 0.2, width: 0.3, height: 0.3, friction: 0.6, label: 'Sand', priority: 1 },
    ],
    walls: [...ARENA_WALLS],
    terrainZones: [],
    editorWires: [...STANDARD_MOTOR_WIRES],
};

export const PRESETS = {
    'blink': BLINK,
    'motor-drive': MOTOR_DRIVE,
    'obstacle-avoider': OBSTACLE_AVOIDER,
    'line-follower': LINE_FOLLOWER,
    'remote-control': REMOTE_CONTROL,
    'encoder-pid': ENCODER_PID,
    'stepper-control': STEPPER_CONTROL,
    'light-follower': LIGHT_FOLLOWER,
    'temp-logger': TEMP_LOGGER,
    'maze-solver': MAZE_SOLVER,
    'slalom-course': SLALOM_COURSE,
    'ice-rink-drift': ICE_RINK_DRIFT,
    'hill-climb': HILL_CLIMB,
    'sumo-bot': SUMO_BOT,
    'sensor-playground': SENSOR_PLAYGROUND,
} as const;

export type PresetName = keyof typeof PRESETS;
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
