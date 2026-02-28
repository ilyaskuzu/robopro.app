---
name: physics-patterns
description: Timestep management, integration methods, unit system, friction models, and electrical models for the ROBOPRO simulation core. Use when implementing or modifying physics engines, motor models, or electrical calculations.
---

# Physics Patterns Guide

## Unit System

All physics in ROBOPRO use **SI units exclusively**. No exceptions.

| Quantity | Unit | Symbol |
|----------|------|--------|
| Length | meters | m |
| Time | seconds | s |
| Mass | kilograms | kg |
| Force | newtons | N |
| Torque | newton-meters | Nm |
| Angle | radians | rad |
| Angular velocity | radians/second | rad/s |
| Voltage | volts | V |
| Current | amps | A |
| Resistance | ohms | Ω |
| Capacitance | amp-hours | Ah |
| Power | watts | W |

### Conversion Reference

```
RPM → rad/s: multiply by 2π/60 (≈ 0.10472)
rad/s → RPM: multiply by 60/2π (≈ 9.5493)
cm → m: divide by 100
μs → s: multiply by 1e-6
```

## Timestep Management

### Fixed Timestep Loop

The simulation uses a **fixed timestep** to ensure determinism:

```typescript
const FIXED_DT = 1 / 120; // 8.33ms per physics step
```

The `SimulationLoop` accumulates wall-clock time and runs fixed steps:

```
update(wallDelta):
  accumulator += wallDelta * speedMultiplier
  while accumulator >= FIXED_DT:
    stepFixed()        // one physics step
    accumulator -= FIXED_DT
```

This guarantees:
- Same results regardless of frame rate
- Reproducible simulations for testing
- Stable numerical integration

### Speed Multiplier

Users can adjust simulation speed (0.1x to 10x). This scales the wall-clock delta, not the physics timestep. `dt` is always `FIXED_DT`.

## Integration Method

### Default: Semi-Implicit Euler

```
velocity += acceleration * dt    // update velocity FIRST
position += velocity * dt        // then use NEW velocity
```

This is more stable than explicit Euler (which uses old velocity for position) at negligible computational cost. For the robot car simulation, this provides adequate accuracy.

### When to Use Higher-Order Methods

If a future component needs higher accuracy (e.g., multi-body dynamics, spring-damper systems), use **Velocity Verlet** or **RK4**. Document the method choice in the class.

## Motor Model

### Linear Torque-Speed Curve

DC motors follow an approximately linear torque-speed relationship:

```
torque = stallTorque * (V_applied/V_nominal - omega/noLoadSpeed)
```

Where:
- `stallTorque`: Maximum torque at zero speed (from datasheet)
- `noLoadSpeed`: Maximum speed at zero torque (from datasheet)
- `V_applied/V_nominal`: Voltage ratio (scales the entire curve)
- `omega`: Current angular velocity

### Back-EMF

A spinning motor generates back-EMF proportional to speed:

```
backEmf = (omega / noLoadSpeed) * V_nominal
```

The current drawn by the motor:

```
current = (V_applied - backEmf) / windingResistance
```

### Rotor Dynamics

```
netTorque = motorTorque + frictionTorque(viscous + stiction)
alpha = netTorque / rotorInertia
omega += alpha * dt
```

## Electrical Model

### Ohm's Law Power Bus

```
V_terminal = V_battery * SoC - I_total * R_internal
P_total = V_terminal * I_total
```

Where:
- `SoC`: State of Charge (0.0–1.0)
- `R_internal`: Battery internal resistance
- `I_total`: Sum of all load currents

### Battery Depletion

```
charge_Ah -= I_total * (dt / 3600)
SoC = charge_remaining / capacity
```

## Friction Models

### Rolling Friction (wheels)

Linear viscous model:

```
frictionTorque = -rollingFriction * omega
```

Adequate for low-speed robot cars. For higher fidelity, add Coulomb (static) friction:

```
if |omega| < threshold:
  frictionTorque = -sign(netAppliedTorque) * min(|netAppliedTorque|, staticFriction)
else:
  frictionTorque = -kineticFriction * sign(omega)
```

### Motor Friction

Viscous damping coefficient in Nm/(rad/s). Combined with the torque-speed curve to model real-world motor behavior.

## Differential Drive Kinematics

```
v_robot = (v_left + v_right) / 2
omega_robot = (v_right - v_left) / trackWidth

heading += omega_robot * dt
x += v_robot * sin(heading) * dt
y += v_robot * cos(heading) * dt
```

Convention: heading=0 points along +Y axis, clockwise-positive.

## Adding New Physics

1. All physics classes go in `core/physics/`
2. Define an interface in `core/physics/interfaces/`
3. Accept parameters via constructor (DI)
4. `tick(dt)` must be deterministic given same inputs
5. Provide `reset()` to return to initial state
6. Write tests in `tests/core/` — no DOM required
7. Use SI units and document any assumptions
