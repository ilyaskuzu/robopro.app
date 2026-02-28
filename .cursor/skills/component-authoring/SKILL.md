---
name: component-authoring
description: Step-by-step guide for authoring new simulated hardware components in ROBOPRO. Use when adding a new sensor, actuator, motor driver, or power component from a real-world spec sheet.
---

# Component Authoring Guide

## Quick Start

To add a new hardware component to ROBOPRO:

1. Identify the component category (actuator, sensor, driver, power)
2. Gather the real datasheet parameters
3. Create the class implementing the correct interface
4. Declare the pin manifest
5. Register in ComponentRegistry
6. Add a 3D visual in `src/scene/components/`

## Step-by-Step

### Step 1: Choose the Interface

| Category | Interface | Location | Example |
|----------|-----------|----------|---------|
| Motor/Servo | `IActuator` | `core/components/interfaces/` | DcMotor |
| Sensor | `ISensor` | `core/components/interfaces/` | UltrasonicSensor |
| Shield/Driver | `IDriver` | `core/components/interfaces/` | L298N |
| Battery/PSU | `IComponent` | `core/components/interfaces/` | BatteryPack |

### Step 2: Gather Spec-Sheet Parameters

Extract from the real datasheet. Example for HC-SR04:
- Operating voltage: 5V
- Trigger pulse: 10μs HIGH
- Echo pulse width: proportional to distance (58μs/cm)
- Range: 2cm - 400cm

### Step 3: Create the Class

Use the template in [component-template.md](component-template.md).

Place the file in the correct subdirectory:
- `core/components/motors/` for motors and servos
- `core/components/sensors/` for sensors
- `core/components/drivers/` for shield boards
- `core/components/power/` for power components

### Step 4: Implement `tick(dt)`

This is called every simulation timestep. Compute outputs based on current pin inputs and internal state. Must be deterministic.

### Step 5: Register

Add to `ComponentRegistry` so the UI can discover and instantiate it.

### Step 6: Add 3D Visual

Create a React component in `src/scene/components/` that reads the component's state from the store and renders an appropriate 3D representation.

## Additional Resources

- Full class template: [component-template.md](component-template.md)
