# ROBOPRO

A browser-based virtual microcontroller simulation environment. Load Arduino sketches onto a simulated MCU, wire up real-world components from spec sheets, and observe behavior in a 3D-visualized robot car — without purchasing any hardware.

---

## Features

### Current Features

| Area | Feature | Description |
|------|---------|-------------|
| **MCU** | Arduino Uno emulation | avr8js-based AVR emulation; D0–D13 digital, A0–A5 analog pins |
| **Sketch execution** | Lightweight interpreter | Parses Arduino-style `.ino` source; no AVR compiler required |
| **Supported API** | `pinMode`, `digitalWrite`, `analogWrite`, `delay`, `Serial.print/println` | Executes against pin state callbacks in real time |
| **Components** | DcMotor (TT motor 6V) | Linear torque-speed curve, back-EMF, viscous friction |
| | L298N dual H-bridge | IN1/IN2/ENA per channel; PWM to motor torque |
| | BatteryPack (4×AA) | Voltage sag under load, charge depletion |
| **Physics** | KineticEngine | Differential-drive dynamics, semi-implicit Euler integration |
| | ElectricalEngine | Ohm's law power bus, battery model |
| | VehicleDynamics | Rigid-body kinematics, wheel slip model |
| **Simulation** | Fixed timestep (60 Hz) | Deterministic, reproducible results |
| | SignalBus | Routes MCU pin outputs → component pin inputs |
| | WiringGraph | Adjacency list: MCU pin ↔ component pin |
| **UI** | Monaco code editor | Arduino sketch editing with syntax highlighting |
| | 3D viewport | React Three Fiber scene; robot car, wheels, ground grid |
| | Serial monitor | Real-time `Serial.print` output |
| | Wiring panel | View wire connections and pin states |
| | Motion log | Session position/velocity data; downloadable JSON |
| **State** | Zustand stores | `useSimulationStore`, `useMcuStore`, `useWiringStore` |

### Planned / Future Features

| Area | Feature | Status |
|------|---------|--------|
| **MCU** | Full AVR hex compilation | Arduino CLI / WASM; load compiled firmware |
| | Additional boards | Arduino Mega, Nano, ESP32 |
| **Sketch** | Extended API | `analogRead`, `digitalRead`, `millis`, `map`, `constrain` |
| | Libraries | Common Arduino libraries (Servo, Wire, etc.) |
| **Components** | UltrasonicSensor (HC-SR04) | Trigger/echo timing, distance → component |
| | IrLineSensor (TCRT5000) | Reflectance → digital output |
| | RotaryEncoder | Wheel speed → pulse train |
| | Servo motor | Position control, PWM input |
| | ComponentRegistry UI | Drag-and-drop component placement |
| **Physics** | Obstacle collision | 3D collision detection for sensors |
| | Terrain / friction | Different surface types |
| **UI** | Visual wiring editor | Drag wires between pins |
| | Component catalog | Browse and add components from registry |
| | Speed control | 0.1×–10× simulation speed |
| | Dark/light theme toggle | Design system supports both |
| **Export** | Replay / playback | Re-run motion from saved log |
| | Share projects | Export/import wiring + sketch |

---

## Architecture

Three isolated layers (enforced by import rules):

```
UI (app/, components/) → State (lib/stores/) → Core (core/)   ✅
Core → State   ❌   Core → UI   ❌   State → UI   ❌
```

### Layer A: Core (`core/`)

Framework-agnostic TypeScript. **Zero** React / Three.js / Zustand / Next.js imports.

```
core/
├── mcu/              Virtual microcontroller (avr8js, Arduino Uno pin map)
├── components/       Simulated hardware (motors, sensors, drivers, power)
├── physics/          KineticEngine, ElectricalEngine, VehicleDynamics
├── simulation/       SignalBus, WiringGraph, SimulationLoop
└── sketch/           SketchInterpreter (Arduino-style parsing)
```

### Layer B: State (`lib/stores/`)

Zustand stores. Single source of truth. May import from `core/` only.

| Store | Owns |
|-------|------|
| `useSimulationStore` | Play/pause, speed, kinetic state, motion log, sketch source |
| `useMcuStore` | Board family, firmware, pin states, serial buffer |
| `useWiringStore` | Placed components, wire connections |

### Layer C: Render (`app/`, `components/`)

React + R3F + Monaco. Pure consumers of state.

```
app/                  Next.js pages, layout
components/
├── layout/           SimulatorShell, Header, StatusBar, BottomPanel
├── editor/           CodeEditorPanel (Monaco)
├── scene/            ViewportPanel, RobotCar, SimulationDriver
├── wiring/           WiringPanel
├── serial/           SerialMonitor
└── motion/           MotionLogPanel, SaveMotionLogOnStop
```

---

## Getting Started

```bash
npm install
npm run dev        # Start dev server at localhost:3000 (Next.js + Turbopack)
npm test           # Run physics engine tests (Vitest, no browser)
npm run test:watch # Watch mode for tests
```

---

## Project Structure

```
ROBOPRO/
├── app/              Next.js App Router
├── components/       React UI components
├── core/             Simulation core (no framework deps)
├── lib/stores/       Zustand state
├── public/           Static assets (robots.txt, llms.txt, etc.)
├── tests/            Vitest tests (core + integration)
└── .cursor/          Skills, rules, architecture docs
```

---

## Adding Components

See [`.cursor/skills/component-authoring/SKILL.md`](.cursor/skills/component-authoring/SKILL.md) for the full guide. Summary:

1. Create class implementing `IComponent`, `IActuator`, `ISensor`, or `IDriver`
2. Place in `core/components/{motors|sensors|drivers|power}/`
3. Add 3D visual in `components/scene/`
4. Wire into `SimulatorShell` bootstrap (or future ComponentRegistry UI)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript (strict mode) |
| Framework | Next.js 15, React 19 |
| 3D | Three.js, React Three Fiber, Drei |
| State | Zustand |
| MCU emulation | avr8js |
| Editor | Monaco Editor |
| Styling | Tailwind CSS |
| Testing | Vitest |

---

## Physics Conventions

- **SI units**: meters, seconds, radians, volts, amps
- **Fixed timestep**: 60 Hz for determinism
- **Integration**: Semi-implicit Euler (velocity first, then position)
- **Motor model**: Linear torque-speed curve, back-EMF, viscous friction

See [`.cursor/skills/physics-patterns/SKILL.md`](.cursor/skills/physics-patterns/SKILL.md) for details.

---

## Motion Log

Session logs are saved when stopping the simulation. See [`logs/README.md`](logs/README.md) for format and interpretation.

---

---

## LLM-Ready Files

For AI systems and crawlers, the following files are available at the site root:

| File | Purpose |
|------|---------|
| `/llms.txt` | Project identity, services, exclusions (llms.txt spec v1.1.1) |
| `/ai.txt` | AI interaction guidance, permissions, citation format |
| `/identity.json` | Structured project identity (JSON) |
| `/faq-ai.txt` | FAQ in AI-readable format |
| `/robots.txt` | Crawler directives (generated) |
| `/sitemap.xml` | Site structure (generated) |

**Base URL:** Set `NEXT_PUBLIC_BASE_URL` (e.g. `https://www.robopro.app`) for production. Defaults to `https://www.robopro.app` in configs.

---

## License

Private project. See repository for terms.
