/**
 * Sensor specifications from datasheets.
 */
export interface SensorSpecs {
  /** Sensor sensing type */
  readonly sensorType: 'ultrasonic' | 'ir-line' | 'ir-distance' | 'ldr' | 'temperature' | 'imu' | 'encoder';
  /** Operating voltage (V) */
  readonly operatingVoltage: number;
  /** Current draw (mA) */
  readonly currentDrawMa: number;
  /** Sensing range [min, max] in the sensor's primary unit */
  readonly range: readonly [number, number];
  /** Primary unit of measurement */
  readonly unit: string;
  /** Accuracy / resolution description */
  readonly accuracy: string;
  /** Number of signal pins (excluding VCC/GND) */
  readonly signalPinCount: number;
}

export interface SensorCatalogEntry {
  readonly id: string;
  readonly displayName: string;
  readonly category: 'sensor';
  readonly specs: SensorSpecs;
  /** Weight in grams */
  readonly weight: number;
  /** Dimensions [length, width, height] in mm */
  readonly dimensions: readonly [number, number, number];
}

export const SENSOR_CATALOG: readonly SensorCatalogEntry[] = [
  {
    id: 'hc-sr04',
    displayName: 'HC-SR04 Ultrasonic',
    category: 'sensor',
    specs: {
      sensorType: 'ultrasonic',
      operatingVoltage: 5,
      currentDrawMa: 15,
      range: [0.02, 4.0],
      unit: 'm',
      accuracy: '±3mm',
      signalPinCount: 2,
    },
    weight: 8.5,
    dimensions: [45, 20, 15],
  },
  {
    id: 'hc-sr04p',
    displayName: 'HC-SR04P (3.3V compat)',
    category: 'sensor',
    specs: {
      sensorType: 'ultrasonic',
      operatingVoltage: 3.3,
      currentDrawMa: 12,
      range: [0.02, 4.0],
      unit: 'm',
      accuracy: '±3mm',
      signalPinCount: 2,
    },
    weight: 8.5,
    dimensions: [45, 20, 15],
  },
  {
    id: 'sharp-gp2y0a21',
    displayName: 'Sharp GP2Y0A21 IR Distance',
    category: 'sensor',
    specs: {
      sensorType: 'ir-distance',
      operatingVoltage: 5,
      currentDrawMa: 30,
      range: [0.10, 0.80],
      unit: 'm',
      accuracy: '±5%',
      signalPinCount: 1,
    },
    weight: 3.5,
    dimensions: [45, 17, 12],
  },
  {
    id: 'tcrt5000',
    displayName: 'TCRT5000 IR Reflectance',
    category: 'sensor',
    specs: {
      sensorType: 'ir-line',
      operatingVoltage: 5,
      currentDrawMa: 20,
      range: [0, 1],
      unit: 'reflectance',
      accuracy: 'digital threshold',
      signalPinCount: 1,
    },
    weight: 1.5,
    dimensions: [10, 6, 7],
  },
  {
    id: 'ldr-module',
    displayName: 'LDR Light Sensor Module',
    category: 'sensor',
    specs: {
      sensorType: 'ldr',
      operatingVoltage: 5,
      currentDrawMa: 5,
      range: [0, 1],
      unit: 'light-level',
      accuracy: 'analog 0–1023',
      signalPinCount: 1,
    },
    weight: 4,
    dimensions: [32, 14, 7],
  },
  {
    id: 'dht11',
    displayName: 'DHT11 Temperature & Humidity',
    category: 'sensor',
    specs: {
      sensorType: 'temperature',
      operatingVoltage: 5,
      currentDrawMa: 2.5,
      range: [0, 50],
      unit: '°C',
      accuracy: '±2°C, ±5% RH',
      signalPinCount: 1,
    },
    weight: 3,
    dimensions: [16, 12, 6],
  },
  {
    id: 'mpu6050',
    displayName: 'MPU-6050 6-Axis IMU',
    category: 'sensor',
    specs: {
      sensorType: 'imu',
      operatingVoltage: 3.3,
      currentDrawMa: 3.9,
      range: [-16, 16],
      unit: 'g (accel)',
      accuracy: '16-bit ADC, ±250–2000°/s gyro',
      signalPinCount: 2,
    },
    weight: 3,
    dimensions: [20, 16, 3],
  },
  {
    id: 'rotary-encoder-20',
    displayName: 'Rotary Encoder (20 slots)',
    category: 'sensor',
    specs: {
      sensorType: 'encoder',
      operatingVoltage: 5,
      currentDrawMa: 10,
      range: [0, Infinity],
      unit: 'pulses/rev',
      accuracy: '20 slots',
      signalPinCount: 1,
    },
    weight: 5,
    dimensions: [32, 14, 7],
  },
  {
    id: 'vl53l0x',
    displayName: 'VL53L0X ToF Laser',
    category: 'sensor',
    specs: {
      sensorType: 'ir-distance',
      operatingVoltage: 3.3,
      currentDrawMa: 19,
      range: [0.03, 2.0],
      unit: 'm',
      accuracy: '0.003',
      signalPinCount: 2,
    },
    weight: 2,
    dimensions: [13, 18, 2],
  },
  {
    id: 'hmc5883l',
    displayName: 'HMC5883L Compass',
    category: 'sensor',
    specs: {
      sensorType: 'imu',
      operatingVoltage: 3.3,
      currentDrawMa: 2,
      range: [-8, 8],
      unit: 'gauss',
      accuracy: '0.002',
      signalPinCount: 2,
    },
    weight: 1,
    dimensions: [13, 15, 2],
  },
  {
    id: 'bmp280',
    displayName: 'BMP280 Barometric Sensor',
    category: 'sensor',
    specs: {
      sensorType: 'temperature',
      operatingVoltage: 3.3,
      currentDrawMa: 0.3,
      range: [300, 1100],
      unit: 'hPa',
      accuracy: '1',
      signalPinCount: 2,
    },
    weight: 1,
    dimensions: [12, 10, 2],
  },
  {
    id: 'hc-sr501',
    displayName: 'HC-SR501 PIR Motion',
    category: 'sensor',
    specs: {
      sensorType: 'ir-distance',
      operatingVoltage: 5,
      currentDrawMa: 0.065,
      range: [0, 1],
      unit: 'motion',
      accuracy: '1',
      signalPinCount: 1,
    },
    weight: 8,
    dimensions: [32, 24, 18],
  },
  {
    id: 'mq2',
    displayName: 'MQ-2 Gas/Smoke Sensor',
    category: 'sensor',
    specs: {
      sensorType: 'ldr',
      operatingVoltage: 5,
      currentDrawMa: 150,
      range: [300, 10000],
      unit: 'ppm',
      accuracy: '100',
      signalPinCount: 1,
    },
    weight: 9,
    dimensions: [32, 22, 16],
  },
  {
    id: 'soil-moisture',
    displayName: 'Capacitive Soil Moisture',
    category: 'sensor',
    specs: {
      sensorType: 'ldr',
      operatingVoltage: 3.3,
      currentDrawMa: 5,
      range: [0, 1],
      unit: 'moisture',
      accuracy: '0.01',
      signalPinCount: 1,
    },
    weight: 4,
    dimensions: [98, 23, 5],
  },
  {
    id: 'vs1838b',
    displayName: 'VS1838B IR Receiver',
    category: 'sensor',
    specs: {
      sensorType: 'ir-line',
      operatingVoltage: 5,
      currentDrawMa: 3,
      range: [0, 1],
      unit: 'signal',
      accuracy: '1',
      signalPinCount: 1,
    },
    weight: 1,
    dimensions: [6, 6, 8],
  },
] as const;

export function findSensor(id: string): SensorCatalogEntry | undefined {
  return SENSOR_CATALOG.find(s => s.id === id);
}
