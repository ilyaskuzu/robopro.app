---
name: robopro-architecture
description: Comprehensive architecture guide for the ROBOPRO MCU simulation platform. Use when making structural decisions, adding new modules, or onboarding to the project's layer boundaries and data flow patterns.
---

# ROBOPRO Architecture Guide

## System Overview

ROBOPRO is a browser-based virtual microcontroller simulation environment. Users load Arduino sketches onto a simulated MCU, wire components, and observe behavior in 3D.

Reference points: Wokwi (code execution), Proteus (circuit sim), Gazebo (3D physics).

## Three-Layer Architecture

### Layer A: Core (`core/`)

Framework-agnostic TypeScript. **Zero** React / Three.js / Zustand / Next.js imports.

```
core/
├── mcu/                          # Virtual microcontroller
│   ├── interfaces/
│   │   ├── IPin.ts               # PinMode, SignalType, PinDirection, IPin, IPinDescriptor
│   │   └── IMicrocontroller.ts   # IMicrocontroller, IFirmware, BoardFamily
│   ├── Pin.ts                    # Concrete pin implementation
│   ├── avr/
│   │   ├── AvrMcu.ts             # avr8js wrapper implementing IMicrocontroller
│   │   └── ArduinoUnoBoard.ts    # Uno pin map (D0–D13, A0–A5), AVR port mapping
│   └── McuFactory.ts             # Create MCU by board family name
│
├── components/                   # Simulated hardware
│   ├── interfaces/
│   │   ├── IComponent.ts         # Base: id, pins[], tick(dt), reset()
│   │   ├── IActuator.ts          # extends IComponent + getOutput()
│   │   ├── ISensor.ts            # extends IComponent + setEnvironment()
│   │   └── IDriver.ts            # extends IComponent + getChannelOutput()
│   ├── BaseComponent.ts          # Abstract base with pin initialization
│   ├── motors/DcMotor.ts         # Linear torque-speed, back-EMF, viscous friction
│   ├── drivers/L298N.ts          # Dual H-bridge: IN1/IN2/ENA per channel
│   ├── sensors/
│   │   ├── UltrasonicSensor.ts   # HC-SR04: trigger/echo timing
│   │   ├── IrLineSensor.ts       # TCRT5000: reflectance → digital out
│   │   └── RotaryEncoder.ts      # Slotted disc: wheel speed → pulse train
│   └── power/BatteryPack.ts      # Voltage sag under load, charge depletion
│
├── physics/
│   ├── interfaces/
│   │   ├── IKineticEngine.ts     # IKineticState, IKineticInput, IRobotParams
│   │   └── IElectricalEngine.ts  # IElectricalState, IElectricalLoad, IBatteryParams
│   ├── KineticEngine.ts          # Differential-drive dynamics, semi-implicit Euler
│   └── ElectricalEngine.ts       # Ohm's law, battery model
│
├── simulation/
│   ├── SignalBus.ts              # Routes pin signals (source → dest)
│   ├── WiringGraph.ts            # Adjacency list: MCU pin ↔ component pin
│   ├── ComponentRegistry.ts      # Available component types catalog
│   ├── defaultRegistry.ts        # Pre-populated registry with all built-in types
│   └── SimulationLoop.ts         # Fixed-timestep game loop (120 Hz)
│
└── index.ts                      # Barrel exports
```

### Layer B: State (`lib/stores/`)

Zustand stores. Single source of truth. May import from `core/` only.

| Store | File | Owns |
|-------|------|------|
| `useSimulationStore` | `lib/stores/useSimulationStore.ts` | Play/pause/stop, speed, timing, kinetic & electrical state snapshots |
| `useMcuStore` | `lib/stores/useMcuStore.ts` | Board family, firmware, pin states, serial buffer, sketch source |
| `useWiringStore` | `lib/stores/useWiringStore.ts` | Placed components, wire connections |

### Layer C: Render (`app/`, `components/`)

React + R3F + Monaco. Pure consumers of state. NOT yet implemented.

```
app/
├── layout.tsx                    # Root layout with fonts, metadata
├── page.tsx                      # Main page (placeholder)
└── globals.css                   # Tailwind + CSS variables

components/                       # (to be built by UI agents)
├── ui/                           # shadcn primitives
├── layout/                       # App shell
├── editor/                       # Monaco wrapper
├── scene/                        # R3F canvas + 3D components
├── controls/                     # Play/Pause/Reset
├── wiring/                       # Pin wiring panel
└── serial/                       # Serial monitor
```

## Data Flow

```
User writes Arduino sketch
  → Monaco editor (components/editor/)
  → Compile to AVR hex (Arduino CLI / WASM)
  → Load into AvrMcu via useMcuStore.setFirmware()
  → SimulationLoop.play()
  → Per fixed step (120 Hz):
      1. MCU tick (advance CPU cycles)
      2. SignalBus.propagate() (MCU pins → component pins)
      3. Component tick (DcMotor, L298N, sensors advance dt)
      4. TorqueProvider gathers motor outputs → KineticEngine.tick()
      5. ElectricalEngine.tick() (power budget)
      6. EnvironmentProvider pushes world state → sensors
  → useSimulationStore.updateFromLoop() snapshots kineticState
  → R3F scene reads store via useSimulationStore selectors
  → 3D renders at screen refresh rate
```

## Import Direction (ENFORCED)

```
UI → State → Core    ✅
Core → State          ❌
Core → UI             ❌
State → UI            ❌
```

## Dependency Injection Pattern

Core classes accept interfaces via constructor, never instantiate concrete deps:

```typescript
const loop = new SimulationLoop(
  mcu,              // IMicrocontroller
  signalBus,        // SignalBus
  kineticEngine,    // IKineticEngine
  electricalEngine, // IElectricalEngine
);
```

## Key Design Decisions

- **avr8js** for AVR emulation (same engine as Wokwi)
- **Fixed timestep** (1/120s) for deterministic simulation
- **Semi-implicit Euler** integration (velocity first, then position)
- **SignalBus** decouples MCU from components (no direct references)
- **WiringGraph** stores topology as adjacency list
- **ComponentRegistry** enables runtime discovery and instantiation
- **SI units everywhere** — no exceptions

## Extension Points

### Adding a new component
1. Implement interface in `core/components/interfaces/`
2. Extend `BaseComponent` in appropriate subdirectory
3. Register in `core/simulation/defaultRegistry.ts`
4. Add 3D visual in `components/scene/`
5. See the `component-authoring` skill for detailed guide + template

### Adding a new MCU
1. Implement `IMicrocontroller` in `core/mcu/<family>/`
2. Create pin mapping file
3. Register in `McuFactory`
4. Add board option to `useMcuStore`

### Adding a new physics model
1. Define interface in `core/physics/interfaces/`
2. Implement with deterministic `tick(dt)` + `reset()`
3. Wire into `SimulationLoop`
4. Write tests in `tests/core/`
5. See the `physics-patterns` skill for conventions

## Testing

All core tests run in Node (no DOM). Located in `tests/core/`.

```bash
npm test          # run all tests once
npm run test:watch # watch mode
```

Currently: 35 tests across 5 files covering KineticEngine, DcMotor, L298N, SignalBus, ElectricalEngine.
