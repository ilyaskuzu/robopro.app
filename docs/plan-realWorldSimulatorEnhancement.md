# ROBOPRO — Real-World Simulator Enhancement Plan

> **Branch:** `enhancement/phase-2`  
> **Repo:** `ilyaskuzu/robopro.app`  
> **Stack:** Next.js 15.3 · React 19 · TypeScript 5.7 · Three.js 0.172 / R3F 9.5 · Zustand 5 · avr8js 0.20.1 · Vitest 3  
> **Architecture:** 3-layer — Core (`core/`) → State (`lib/stores/`) → Render (`components/`, `app/`)  
> **Last updated:** 2025-07-20

---

## Status Summary

| Phase | Description                              | Status          | Tests       |
| ----- | ---------------------------------------- | --------------- | ----------- |
| 1     | Real-World Component Catalogs            | **COMPLETE** ✅  | 256 passing |
| 2     | Dynamic SimulationConfig & Physics       | **COMPLETE** ✅  | 36 passing  |
| 3     | Component Selector UI & Dynamic Car      | **COMPLETE** ✅  | 17 passing  |
| 4     | Breadboard-Style 2D Wiring Editor        | NOT STARTED ⬜   | —           |
| 5     | 3D Environment Editor                    | NOT STARTED ⬜   | —           |
| 6     | Sketch Interpreter Extensions            | NOT STARTED ⬜   | —           |
| 7     | Simulation Accuracy                      | PARTIAL (~10%) ⚠️ | —           |
| 8     | Final Integration & Polish               | NOT STARTED ⬜   | —           |

**Totals:** 309 tests · 33 test files · 0 TypeScript errors

---

## Phase 1 — Real-World Component Catalogs ✅

### Goal
Replace hard-coded specs with datasheet-accurate component catalogs, add new component types, support multiple MCU boards, and bootstrap a component registry.

### Delivered Files

| Area | File | Notes |
|------|------|-------|
| Catalogs | `core/components/catalog/motorCatalog.ts` | `MOTOR_CATALOG` — TT Motor 3V/6V, N20, GA25, JGB37 |
| | `core/components/catalog/servoCatalog.ts` | `SERVO_CATALOG` — SG90, MG90S, MG996R |
| | `core/components/catalog/driverCatalog.ts` | `DRIVER_CATALOG` — L298N, L293D, TB6612FNG, DRV8833 |
| | `core/components/catalog/sensorCatalog.ts` | `SENSOR_CATALOG` — IR line, ultrasonic, rotary encoder, MPU-6050, LDR, DHT11 |
| | `core/components/catalog/batteryCatalog.ts` | `BATTERY_CATALOG` — 4×AA alkaline/NiMH, 2S/3S LiPo, 9V |
| | `core/components/catalog/mcuCatalog.ts` | `MCU_CATALOG` — Arduino Uno/Nano/Mega, ESP32 DevKit |
| | `core/components/catalog/index.ts` | Barrel with UPPER_SNAKE_CASE re-exports |
| Motors | `core/components/motors/DcMotor.ts` | Spec-driven DC motor |
| Actuators | `core/components/actuators/ServoMotor.ts` | Angular, speed, torque |
| | `core/components/actuators/Buzzer.ts` | Frequency-based buzzer |
| | `core/components/actuators/Led.ts` | PWM-capable LED |
| Sensors | `core/components/sensors/Mpu6050Sensor.ts` | 6-axis IMU |
| | `core/components/sensors/LdrSensor.ts` | Light-dependent resistor |
| | `core/components/sensors/Dht11Sensor.ts` | Temp/humidity |
| | `core/components/sensors/IrLineSensor.ts` | Line-following |
| | `core/components/sensors/UltrasonicSensor.ts` | Distance (HC-SR04) |
| | `core/components/sensors/RotaryEncoder.ts` | Pulse-counting |
| Drivers | `core/components/drivers/L293D.ts` | Dual H-bridge |
| | `core/components/drivers/L298N.ts` | Dual H-bridge |
| | `core/components/drivers/TB6612FNG.ts` | Dual H-bridge |
| | `core/components/drivers/DRV8833.ts` | Dual H-bridge |
| Power | `core/components/power/BatteryPack.ts` | Spec-driven battery |
| MCU | `core/mcu/McuFactory.ts` | Board factory |
| | `core/mcu/avr/AvrMcu.ts` | AVR-based boards |
| | `core/mcu/esp/Esp32Mcu.ts` | ESP32 stub |
| Registry | `core/simulation/ComponentRegistry.ts` | Type → factory map |
| | `core/simulation/registryBootstrap.ts` | Auto-registers all types |

### Tests (12 files)
`DcMotor.test.ts`, `ServoMotor.test.ts`, `Buzzer.test.ts`, `Led.test.ts`, `Mpu6050Sensor.test.ts`, `LdrSensor.test.ts`, `Dht11Sensor.test.ts`, `IrLineSensor.test.ts`, `UltrasonicSensor.test.ts`, `RotaryEncoder.test.ts`, `L293D.test.ts`, `TB6612FNG.test.ts`, `DRV8833.test.ts`, `L298N.test.ts`, `ComponentRegistry.test.ts`

---

## Phase 2 — Dynamic SimulationConfig & Physics Extensibility ✅

### Goal
Enable spatial physics features: surface friction zones, wall collisions, terrain/slope zones. Extend `VehicleDynamics` with callback-based friction/slope queries. Upgrade serialization to v2.

### Delivered Files

| File | Notes |
|------|-------|
| `core/simulation/FrictionMap.ts` | `FrictionZone`, `FRICTION_MATERIALS`, priority-based zone resolution |
| `core/simulation/WallWorld.ts` | Wall segments, circle-vs-segment collision, raycast |
| `core/simulation/TerrainMap.ts` | Ramp zones, elevation, slope/gravity computation |
| `core/physics/VehicleDynamics.ts` | `FrictionQueryFn`, `SlopeQueryFn`, `setFrictionQuery`, `setSlopeQuery`, `resolveWallCollision`, spec-based `tireFrictionCoeff`, `rotationalDamping` |
| `core/simulation/SimulationLoop.ts` | `frictionMap` / `wallWorld` / `terrainMap` constructor params, wall collision after step, enhanced `bridgeSensorEnvironment` |
| `core/simulation/ProjectSerializer.ts` | v2 format with `frictionZones`, `walls`, `terrainZones`, `componentSpecIds`; v1→v2 migration |
| Updated exports | `core/simulation/index.ts`, `core/physics/index.ts` |

### Tests
`FrictionMap.test.ts` (9), `WallWorld.test.ts` (10), `TerrainMap.test.ts` (9), `VehicleDynamics.test.ts` (+5 friction/slope), `ProjectSerializer.test.ts` (9)

---

## Phase 3 — Component Selector UI & Dynamic Car Assembly ✅

### Goal
Build a tabbed component palette UI where users select real-world parts from catalogs. Drive the 3D model and simulation config from those selections via a Zustand project store.

### Delivered Files

| File | Notes |
|------|-------|
| `lib/stores/useProjectStore.ts` | `selectedMotorId` / `selectedBatteryId` / `selectedDriverId` / `selectedBoardType`, `computedMass`, `buildConfig()`, catalog accessors (`getMotorSpec`, `getBatterySpec`, `getDriverSpec`, `getMcuSpec`) |
| `components/palette/ComponentCard.tsx` | Reusable card with category-specific colors, info button, selection state |
| `components/palette/SpecDetailModal.tsx` | Full datasheet modal with all specs from catalogs |
| `components/palette/MotorSelector.tsx` | Grid selector for `MOTOR_CATALOG` |
| `components/palette/BatterySelector.tsx` | Grid selector for `BATTERY_CATALOG` |
| `components/palette/DriverSelector.tsx` | Grid selector for `DRIVER_CATALOG` |
| `components/palette/McuSelector.tsx` | Grid selector for `MCU_CATALOG` |
| `components/palette/ComponentPalette.tsx` | Tabbed UI (Motors / Drivers / Sensors / Power / MCU), `PlacedComponentsList`, computed mass header |
| `components/scene/RobotCar.tsx` | Dynamic 3D dimensions: `wheelRadius` from motor dimensions, chassis adapts, battery scales with capacity/weight, MCU board scales with pin counts |
| `components/layout/SimulatorShell.tsx` | Reads project store, creates component instances, calls `buildConfig()` |
| `components/layout/Header.tsx` | v2 project loading with `specId` lookup, catalog-based component creation |
| `vitest.config.mts` | `@/` path alias for tests |

### Tests
`tests/core/ProjectStore.test.ts` — 17 tests

---

## Phase 4 — Breadboard-Style 2D Wiring Editor ⬜

### Goal
Replace the text-based wiring panel with an interactive SVG-based breadboard editor where users can visually drag wires between component pins.

### Tasks

#### 4.1 — Data Model & Store
- [ ] Create `lib/stores/useWiringEditorStore.ts`
  - Pin positions (absolute SVG coords per component)
  - Wire segments (from-pin → to-pin with path data)
  - Hover/selection state
  - Validate connections (incompatible pin warning)
  - Undo/redo stack for wire operations
- [ ] Extend `core/simulation/WiringGraph.ts` with serializable wire-path metadata
- [ ] Add `wires` array to `ProjectSerializer` v2 schema

#### 4.2 — SVG Components
- [ ] Create `components/wiring/BreadboardEditor.tsx`
  - SVG canvas with pan/zoom (transform matrix)
  - Component placement regions (MCU, driver, sensors)
  - Rail markers for VCC/GND
- [ ] Create `components/wiring/BreadboardComponent.tsx`
  - Generic SVG component renderer with labeled pin stubs
  - Show component image/icon + pin labels
  - Draggable positioning within the breadboard
- [ ] Create `components/wiring/PinStub.tsx`
  - Interactive pin endpoint: hover highlight, click to start/end wire
  - Color-coded by type (digital, analog, power, ground)
  - Tooltip with pin details (name, mode, current value)
- [ ] Create `components/wiring/WireDrawer.tsx`
  - Click-to-place wire routing (click source pin → click target pin)
  - Wire path rendering (orthogonal routing or freeform)
  - Wire colors by signal type
  - Right-click to delete wire

#### 4.3 — Validation & Feedback
- [ ] Real-time connection validation (e.g., two outputs on same net)
- [ ] Visual error indicators on invalid wires (red highlight)
- [ ] Wire capacity indicators for current-carrying wires
- [ ] Auto-connect suggestions for common configurations

#### 4.4 — Integration
- [ ] Replace current `WiringPanel.tsx` table UI with BreadboardEditor
- [ ] Sync breadboard state → `useWiringStore` for simulation
- [ ] Save/load breadboard layout in project file (v2)

#### 4.5 — Tests
- [ ] `tests/core/WiringEditorStore.test.ts` — Store operations, undo/redo
- [ ] `tests/core/BreadboardEditor.test.ts` — Wire creation, validation, serialization (unit + component tests)

---

## Phase 5 — 3D Environment Editor ⬜

### Goal
Provide visual tools to place and manipulate friction zones, walls, terrain ramps, and obstacles directly in the Three.js viewport. The core data models already exist from Phase 2 — this phase adds the UI/3D rendering layer.

### Tasks

#### 5.1 — Environment Store
- [ ] Create `lib/stores/useEnvironmentStore.ts`
  - Active tool (select / place-wall / place-friction / place-ramp / place-obstacle)
  - Selected entity reference
  - Transform mode (translate / rotate / scale)
  - Entity CRUD operations
  - Sync to FrictionMap, WallWorld, TerrainMap instances

#### 5.2 — 3D Mesh Components
- [ ] Create `components/scene/FrictionZoneMesh.tsx`
  - Semi-transparent colored plane from `FrictionZone` data
  - Material label overlay (e.g., "ICE", "SAND", "RUBBER")
  - Color mapped to `FRICTION_MATERIALS` coefficient
  - Interactive resize handles (corner drag)
- [ ] Create `components/scene/WallMesh.tsx`
  - Extruded wall segment from `Wall` data
  - Wall thickness, height, and position
  - Snap-to-grid placement
- [ ] Create `components/scene/RampMesh.tsx`
  - Angled plane from `TerrainZone` data
  - Visual slope indicator
  - Elevation labels
- [ ] Create `components/scene/ObstacleMesh.tsx`
  - Box/cylinder obstacles from `ObstacleWorld` config
  - Physics collider visualization

#### 5.3 — Toolbar & Controls
- [ ] Create `components/scene/EnvironmentToolbar.tsx`
  - Tool buttons: Select, Wall, Friction Zone, Ramp, Obstacle
  - Properties panel for selected entity (position, size, material, etc.)
  - Delete button, duplicate button
  - Snap-to-grid toggle
- [ ] Add transform gizmo (Three.js TransformControls) for selected entity
- [ ] Grid overlay with configurable spacing

#### 5.4 — Integration
- [ ] Wire environment store changes → simulation core (FrictionMap, WallWorld, TerrainMap)
- [ ] Auto-save environment to project file via ProjectSerializer v2
- [ ] Update `ViewportPanel.tsx` to render environment meshes and toolbar

#### 5.5 — Tests
- [ ] `tests/core/EnvironmentStore.test.ts` — CRUD, sync to core objects
- [ ] `tests/core/EnvironmentMeshes.test.ts` — Rendering validation (optional, may use testing-library/react)

---

## Phase 6 — Sketch Interpreter Extensions ⬜

### Goal
Extend the AST-based `SketchInterpreter` to support more Arduino language features and libraries, bringing it closer to real Arduino IDE compatibility.

### Current "Not Yet Supported" List
From `core/sketch/SketchInterpreter.ts`:
- Arrays and strings
- switch/case
- Servo / Wire / SPI libraries
- Function parameters and return values (non-void)
- do...while, break/continue
- Ternary operator (`?:`)
- Type casting

### Tasks

#### 6.1 — Language Features
- [ ] **switch/case/default** — Parse switch statement, match cases, fall-through semantics, break
- [ ] **do...while** — Parse and execute do-while loop
- [ ] **break/continue** — Add break/continue support to for, while, do-while loops
- [ ] **Ternary operator** — `condition ? a : b` expression
- [ ] **Array literals & indexing** — `int arr[] = {1,2,3};`, `arr[i]`, `arr[i] = val;`
- [ ] **String type** — `String s = "hello";`, `.length()`, `.charAt()`, `.substring()`, `+` concatenation, `.indexOf()`, `.toInt()`
- [ ] **Function parameters** — `void foo(int x, int y)` parsing and scoped variables
- [ ] **Function return values** — `int foo() { return 42; }` with return statement
- [ ] **Type casting** — `(int)floatVal`, `(float)intVal`

#### 6.2 — Arduino Library Stubs
- [ ] **Servo library**
  - `Servo myservo;` — declare servo object
  - `myservo.attach(pin)` — attach to PWM pin
  - `myservo.write(angle)` — set angle 0–180
  - `myservo.read()` — current angle
  - `myservo.detach()`
  - Bridge to `ServoMotor` component via SignalBus
- [ ] **pulseIn(pin, value, timeout)** — Measure pulse width on pin
  - Return pre-set ultrasonic echo duration for distance simulation
- [ ] **tone(pin, frequency, duration)** / **noTone(pin)** — Buzzer control
  - Bridge to `Buzzer` component
- [ ] **Wire library (I2C)** — Stub for `Wire.begin()`, `Wire.requestFrom()`, `Wire.read()`, `Wire.write()`
  - Bridge to MPU-6050 and other I2C sensors

#### 6.3 — Tests
- [ ] Extend `tests/core/SketchInterpreter.test.ts` with new feature groups:
  - switch/case tests (5+)
  - Array tests (5+)
  - String tests (5+)
  - Function params/return tests (5+)
  - Servo library tests (5+)
  - pulseIn/tone tests (3+)
  - break/continue tests (3+)
  - Ternary tests (3+)

---

## Phase 7 — Simulation Accuracy ⬜

### Goal
Improve physics fidelity with real-world electrical and mechanical models. The catalog data (gear ratios, etc.) already exists from Phase 1 — this phase wires it into the physics engine.

### Current State
- `gearRatio` field exists in motor catalogs but is **not applied** in physics
- No rotor inertia, current limiting, battery discharge, or advanced tire model

### Tasks

#### 7.1 — Motor Physics
- [ ] **Wire gear ratio into ElectricalEngine / DcMotor**
  - Apply `gearRatio` to torque multiplication and speed reduction
  - `outputTorque = motorTorque * gearRatio`
  - `outputSpeed = motorSpeed / gearRatio`
- [ ] **Rotor inertia** — Add `rotorInertia` (kg·m²) to motor specs
  - First-order motor dynamics: `dω/dt = (τ_motor - τ_load - b·ω) / J`
  - Smooth acceleration/deceleration curves
- [ ] **Back-EMF modeling** — Counter-EMF reduces effective voltage
  - `V_eff = V_supply - Ke·ω`
  - Simulate no-load vs loaded current draw

#### 7.2 — Driver Electronics
- [ ] **Current limiting** — Driver `maxCurrent` from catalog limits motor peak current
  - Clamp or thermal shutdown behavior
  - Visual warning when current exceeds limit
- [ ] **Voltage drop** — Driver `voltageDrop` reduces motor supply voltage
  - `V_motor = V_battery - V_driver_drop`

#### 7.3 — Battery Model
- [ ] **State-of-charge (SoC) tracking**
  - `SoC = 1 - (consumed_mAh / capacity_mAh)`
  - Internal resistance increases as SoC decreases
  - Voltage sag under load: `V_terminal = V_nominal - I * R_internal`
- [ ] **Discharge curve** — Voltage as function of SoC (simplified linear or lookup table)
- [ ] **Low battery behavior** — Motor slows down as voltage drops
- [ ] **Battery indicator in UI** — Show charge level, estimated time remaining

#### 7.4 — Advanced Tire Model
- [ ] **Pacejka "Magic Formula"** tire friction model
  - Slip ratio calculation: `κ = (v_wheel - v_ground) / max(v_wheel, v_ground)`
  - Lateral/longitudinal force curves
  - Parameters from `tireFrictionCoeff` and surface material
- [ ] **Wheel slip visualization** — Show when wheels are slipping (color-coded or particles)

#### 7.5 — Tests
- [ ] `tests/core/GearRatio.test.ts` — Torque/speed with different gear ratios
- [ ] `tests/core/MotorDynamics.test.ts` — Inertia, back-EMF, transient response
- [ ] `tests/core/DriverCurrentLimit.test.ts` — Current clamping, voltage drop
- [ ] `tests/core/BatteryDischarge.test.ts` — SoC tracking, voltage sag
- [ ] `tests/core/PacejkaTire.test.ts` — Slip ratio, force curves (optional)

---

## Phase 8 — Final Integration & Polish ⬜

### Goal
Unify all phases into a polished, production-ready experience with optimized layout, keyboard shortcuts, project templates, and performance tuning.

### Tasks

#### 8.1 — Layout Modes
- [ ] Create `lib/stores/useLayoutStore.ts` — Active mode, panel visibility
- [ ] Implement three layout modes:
  - **Code Mode** — Code editor fullscreen, small 3D preview
  - **Circuit Mode** — Breadboard editor fullscreen, component palette
  - **Environment Mode** — 3D viewport fullscreen, environment toolbar
- [ ] Mode switcher in Header.tsx
- [ ] Smooth panel transitions (CSS grid animations)

#### 8.2 — Keyboard Shortcuts
- [ ] Global shortcuts:
  - `Ctrl+R` / `Cmd+R` — Run/Stop simulation
  - `Ctrl+S` / `Cmd+S` — Save project
  - `Ctrl+O` / `Cmd+O` — Open project
  - `Ctrl+Z` / `Cmd+Z` — Undo (context-aware: wiring, environment, code)
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` — Redo
  - `1` / `2` / `3` — Switch layout modes
  - `Delete` — Remove selected entity
- [ ] Create keyboard shortcut help dialog (`?` to open)

#### 8.3 — Project Templates
- [ ] Create `core/sketch/presets/` template files:
  - `line-follower.ino` — 2× IR sensor + motor control
  - `obstacle-avoider.ino` — Ultrasonic sensor + motor control
  - `remote-control.ino` — Serial command-based control
  - `encoder-pid.ino` — PID speed control with encoders
- [ ] Template selector in New Project dialog
- [ ] Each template bundles: sketch code, component selections, wiring, environment

#### 8.4 — Performance Optimization
- [ ] **Instanced rendering** — InstancedMesh for repeated environment objects (walls, obstacles)
- [ ] **LOD** — Level-of-detail for complex meshes when zoomed out
- [ ] **Frame budget** — Cap physics steps per frame, interpolate visual state
- [ ] **Web Worker** — Move SketchInterpreter to Web Worker for non-blocking execution
- [ ] **Lazy loading** — Code-split editor panel (Monaco is heavy)

#### 8.5 — Documentation & Help
- [ ] In-app help tooltips for all panels
- [ ] Component wiring diagrams (auto-generated from catalog pin definitions)
- [ ] FAQ integration from `public/faq-ai.txt`

#### 8.6 — Tests
- [ ] `tests/integration/layoutModes.test.ts` — Mode switching, panel visibility
- [ ] `tests/integration/keyboardShortcuts.test.ts` — Shortcut handling
- [ ] `tests/integration/projectTemplates.test.ts` — Template loading, component/wiring restoration

---

## Implementation Order & Dependencies

```
Phase 1 ✅ ──→ Phase 2 ✅ ──→ Phase 3 ✅
                  │                │
                  │                ├──→ Phase 4 (wiring editor, uses catalogs + wiring store)
                  │                │
                  └──→ Phase 5 (3D env editor, uses FrictionMap/WallWorld/TerrainMap from Phase 2)
                                   │
Phase 6 (interpreter, independent) │
                                   │
Phase 7 (accuracy, uses catalogs)  │
                                   │
                  Phase 8 (polish, depends on 4–7)
```

**Recommended order:** 4 → 6 → 5 → 7 → 8

- **Phase 4** first: wiring is the most impactful user-facing gap
- **Phase 6** next: interpreter extensions unlock Servo/tone sketches
- **Phase 5** then: 3D environment editor builds on Phase 2 data models
- **Phase 7** later: simulation accuracy is a refinement pass
- **Phase 8** last: integration & polish wraps everything together

---

## Key Conventions

| Convention | Details |
|-----------|---------|
| Catalog exports | `UPPER_SNAKE_CASE` (e.g., `MOTOR_CATALOG`, `BATTERY_CATALOG`) |
| Catalog property access | Nested under `.specs.` (e.g., `entry.specs.nominalVoltage`) |
| Display names | Use `.displayName`, not `.name` |
| Catalog IDs | Lowercase kebab-case (e.g., `'4xaa-alkaline'`, `'tt-motor-6v'`) |
| Store accessors | Return full catalog entry type (e.g., `MotorCatalogEntry`), not just specs |
| Physics callbacks | Function injection pattern: `FrictionQueryFn`, `SlopeQueryFn` |
| Serialization | ProjectData v2 with backward-compatible v1 migration |
| Tests | Vitest 3, `@/` alias via `vitest.config.mts`, files in `tests/core/` and `tests/integration/` |
| TypeScript | Strict mode, zero errors policy |

---

## File Reference (Implemented)

<details>
<summary>Phase 1 files (click to expand)</summary>

```
core/components/catalog/motorCatalog.ts
core/components/catalog/servoCatalog.ts
core/components/catalog/driverCatalog.ts
core/components/catalog/sensorCatalog.ts
core/components/catalog/batteryCatalog.ts
core/components/catalog/mcuCatalog.ts
core/components/catalog/index.ts
core/components/motors/DcMotor.ts
core/components/actuators/ServoMotor.ts
core/components/actuators/Buzzer.ts
core/components/actuators/Led.ts
core/components/sensors/Mpu6050Sensor.ts
core/components/sensors/LdrSensor.ts
core/components/sensors/Dht11Sensor.ts
core/components/sensors/IrLineSensor.ts
core/components/sensors/UltrasonicSensor.ts
core/components/sensors/RotaryEncoder.ts
core/components/drivers/L293D.ts
core/components/drivers/L298N.ts
core/components/drivers/TB6612FNG.ts
core/components/drivers/DRV8833.ts
core/components/power/BatteryPack.ts
core/mcu/McuFactory.ts
core/mcu/avr/AvrMcu.ts
core/mcu/esp/Esp32Mcu.ts
core/simulation/ComponentRegistry.ts
core/simulation/registryBootstrap.ts
```

</details>

<details>
<summary>Phase 2 files (click to expand)</summary>

```
core/simulation/FrictionMap.ts
core/simulation/WallWorld.ts
core/simulation/TerrainMap.ts
core/physics/VehicleDynamics.ts      (refactored)
core/simulation/SimulationLoop.ts    (upgraded)
core/simulation/ProjectSerializer.ts (v2)
```

</details>

<details>
<summary>Phase 3 files (click to expand)</summary>

```
lib/stores/useProjectStore.ts
components/palette/ComponentCard.tsx
components/palette/SpecDetailModal.tsx
components/palette/MotorSelector.tsx
components/palette/BatterySelector.tsx
components/palette/DriverSelector.tsx
components/palette/McuSelector.tsx
components/palette/ComponentPalette.tsx
components/scene/RobotCar.tsx          (rewritten)
components/layout/SimulatorShell.tsx   (updated)
components/layout/Header.tsx           (updated)
vitest.config.mts
```

</details>

<details>
<summary>All test files (click to expand)</summary>

```
tests/core/DcMotor.test.ts
tests/core/ServoMotor.test.ts
tests/core/Buzzer.test.ts
tests/core/Led.test.ts
tests/core/Mpu6050Sensor.test.ts
tests/core/LdrSensor.test.ts
tests/core/Dht11Sensor.test.ts
tests/core/IrLineSensor.test.ts
tests/core/UltrasonicSensor.test.ts
tests/core/RotaryEncoder.test.ts
tests/core/L293D.test.ts
tests/core/L298N.test.ts
tests/core/TB6612FNG.test.ts
tests/core/DRV8833.test.ts
tests/core/ComponentRegistry.test.ts
tests/core/ElectricalEngine.test.ts
tests/core/KineticEngine.test.ts
tests/core/VehicleDynamics.test.ts
tests/core/SignalBus.test.ts
tests/core/SketchInterpreter.test.ts
tests/core/LineTrack.test.ts
tests/core/ObstacleWorld.test.ts
tests/core/FrictionMap.test.ts
tests/core/WallWorld.test.ts
tests/core/TerrainMap.test.ts
tests/core/ProjectSerializer.test.ts
tests/core/ProjectStore.test.ts
tests/integration/simulationMotionLog.test.ts
```

</details>
