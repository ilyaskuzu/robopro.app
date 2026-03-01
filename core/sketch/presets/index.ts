/**
 * Preset project definitions — bundled example sketches with matching wiring configurations.
 */

import type { ProjectData } from '../../simulation/ProjectSerializer';

const BLINK: ProjectData = {
    version: 1,
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
    components: [],
    wires: [],
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
};

const MOTOR_DRIVE: ProjectData = {
    version: 1,
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
    obstacles: [],
    lineTrack: { points: [], lineWidth: 0.02 },
};

const OBSTACLE_AVOIDER: ProjectData = {
    version: 1,
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
  int dist = analogRead(A0);
  return map(dist, 0, 1023, 0, 400);
}

void loop() {
  int distance = getDistance();
  Serial.print("Distance: ");
  Serial.println(distance);

  if (distance < SAFE_DISTANCE) {
    Serial.println("Obstacle! Turning...");
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
        { x: 0.5, z: 0, radius: 0.05 },
        { x: 0.3, z: 0.3, radius: 0.05 },
    ],
    lineTrack: { points: [], lineWidth: 0.02 },
};

const LINE_FOLLOWER: ProjectData = {
    version: 1,
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
};

export const PRESETS = {
    'blink': BLINK,
    'motor-drive': MOTOR_DRIVE,
    'obstacle-avoider': OBSTACLE_AVOIDER,
    'line-follower': LINE_FOLLOWER,
} as const;

export type PresetName = keyof typeof PRESETS;
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
