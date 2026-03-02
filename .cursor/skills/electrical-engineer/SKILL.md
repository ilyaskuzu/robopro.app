---
name: electrical-engineer
description: EE PhD-level authority for ROBOPRO. Governs circuit topology validation, Kirchhoff's laws, motor electrical models, H-bridge drivers, battery models, power budgets, and wiring validation. Use when implementing or reviewing any electrical component, power path, or circuit validation logic.
---

# Electrical & Electronic Engineer — Expert Guide

> You are an Electrical and Electronic Engineering PhD. Every circuit model must obey Kirchhoff's laws, every current path must be complete, and no component may operate without proper power connections.

## Ownership

| Domain | Files |
|--------|-------|
| Electrical engine | `core/physics/ElectricalEngine.ts` |
| Motor drivers | `core/components/drivers/` (L298N, L293D, DRV8833, TB6612FNG, A4988) |
| Power sources | `core/components/power/BatteryPack.ts` |
| Motor electrical model | `core/components/motors/DcMotor.ts` (electrical coupling) |
| Circuit validation | `core/simulation/CircuitValidator.ts` |

## Fundamental Laws

### Kirchhoff's Voltage Law (KVL)

Around any closed loop, the sum of voltage drops equals zero:

```
V_battery - I·R_internal - V_driver_drop - I·R_armature - V_backEMF = 0
```

Solving for motor current:

```
I_motor = (V_terminal - V_backEMF) / R_armature
V_terminal = V_battery - I_total·R_internal - V_driver_drop
V_backEMF = K_e · ω
```

### Kirchhoff's Current Law (KCL)

At any node, current in equals current out:

```
I_battery = I_motor_left + I_motor_right + I_sensors
```

The total current drawn from the battery must equal the sum of all branch currents.

## Circuit Topology Rules

### Complete Circuit Requirement

**No current flows without a complete path.** For a motor to operate:

```
Battery V_OUT → Driver VCC → Driver OUT_x → Motor POWER → (return path implicit)
```

If ANY link in this chain is missing, that motor receives zero power.

### Validation Checklist

| Check | Condition | Result if failed |
|-------|-----------|------------------|
| Battery → Driver | No wire from `battery.V_OUT` to `driver.VCC` | `supplyVoltage = 0`, all motors dead |
| Driver → Motor | No wire from `driver.OUT_A` to `motor.POWER` | That motor channel is disabled |
| MCU → Driver control | No wire from MCU pin to `driver.ENA/IN1/etc` | That control signal stays at 0 |
| Ground continuity | (implicit in current model) | No effect currently |

### Power Path Validation

```typescript
interface CircuitError {
  severity: 'error' | 'warning';
  component: string;
  message: string;
}

// Example errors:
// { severity: 'error', component: 'motor-left', message: 'No power connection: driver OUT_A is not wired to motor-left POWER' }
// { severity: 'error', component: 'driver', message: 'No power supply: battery V_OUT is not wired to driver VCC' }
// { severity: 'warning', component: 'driver', message: 'ENA pin not connected — channel A will remain disabled' }
```

## Motor Electrical Model

### DC Motor Equivalent Circuit

```
V_terminal = I · R_a + K_e · ω + L · (dI/dt)
```

For our simulation (no inductance, quasi-static):

```
V_terminal = I · R_a + K_e · ω
I = (V_terminal - K_e · ω) / R_a
```

### Electromechanical Coupling

The same constant `K` links electrical and mechanical domains:

```
V_backEMF = K_e · ω        (generator effect)
τ_motor = K_t · I           (motor effect)
K_e ≈ K_t                   (in SI units, for ideal motor)
```

### Torque from Terminal Voltage

```
τ = K_t · (V_terminal - K_e · ω) / R_a
```

This replaces the "linear torque-speed" approximation with a physically grounded model. The linear model is an approximation valid only at nominal voltage.

### Motor Parameters (from datasheet)

| Parameter | Symbol | Derivation |
|-----------|--------|------------|
| Back-EMF constant | `K_e` | `V_nominal / ω_noLoad` |
| Torque constant | `K_t` | `τ_stall / I_stall` (≈ K_e) |
| Armature resistance | `R_a` | `V_nominal / I_stall` |
| No-load speed | `ω_NL` | From datasheet (convert RPM→rad/s) |
| Stall torque | `τ_stall` | From datasheet |
| Stall current | `I_stall` | `V_nominal / R_a` |

## H-Bridge Driver Models

### L298N Truth Table

| ENA | IN1 | IN2 | Mode | OUT |
|-----|-----|-----|------|-----|
| PWM | H | L | Forward | `speed × +1` |
| PWM | L | H | Reverse | `speed × -1` |
| any | L | L | Coast | 0 (free-spinning) |
| any | H | H | Brake | 0 (short-brake) |

### Driver Voltage Drop

Each driver has a characteristic voltage drop that reduces the voltage available to the motor:

| Driver | V_drop | Notes |
|--------|--------|-------|
| L298N | 1.4 V | Bipolar, 2 diode drops |
| L293D | 1.2 V | Bipolar |
| TB6612FNG | 0.5 V | MOSFET, low drop |
| DRV8833 | 0.3 V | MOSFET, low drop |

```
V_motor = V_battery - V_driver_drop
```

### Current Limiting

When present (e.g. DRV8833 at 1.5A), the driver clamps motor current:

```
if I_motor > I_limit:
  I_motor = I_limit
  τ_motor = K_t · I_limit    (torque is also limited)
```

## Battery Model

### Terminal Voltage

```
V_terminal = V_OCV(SoC) - I_total · R_effective
```

### Open-Circuit Voltage (OCV)

Piecewise linear approximation of the discharge curve:

```
SoC  → V_fraction
1.00 → 1.00
0.90 → 0.98
0.20 → 0.90
0.10 → 0.80
0.05 → 0.60
0.00 → 0.00

V_OCV = V_nominal × V_fraction
```

### Internal Resistance Scaling

At low SoC, internal resistance increases:

```
R_effective = R_nominal × (1 + max(0, (0.2 - SoC)) × 5)
```

This models the increased impedance as the battery depletes.

### State-of-Charge Update

```
capacity_remaining -= I_total × (dt / 3600)    // Ah
SoC = capacity_remaining / capacity_total
```

## Power Budget

### Per-Step Energy Balance

```
P_battery = V_terminal × I_total
P_driver_loss = V_driver_drop × I_total
P_motor_copper = Σ(I_motor² × R_a)            // resistive loss
P_motor_mechanical = Σ(τ_motor × ω_motor)     // useful work
P_total_loss = P_driver_loss + P_motor_copper

// Conservation check:
P_battery ≈ P_motor_mechanical + P_total_loss
```

If `P_battery < P_motor_mechanical + P_total_loss`, the model has a leak.

## Wiring Validation Rules

### Before Simulation Starts

1. For each motor in the component map, verify a wire path from driver output to motor power pin exists
2. For each driver, verify a wire path from battery V_OUT to driver VCC exists
3. For each driver control pin (ENA, IN1, etc.), check if an MCU wire exists — warn if not
4. Report all errors to the user before allowing `play()`

### During Simulation

- If `hasPowerConnection()` is false → `supplyVoltage = 0` → nothing moves
- If `isMotorConnected(pin, motorId)` is false → that motor gets no driver output → zero torque
- These checks must use the ACTUAL wiring topology, not hardcoded assumptions

## Anti-Patterns (NEVER do these)

- Assuming power exists without checking the wire topology
- Using nominal voltage instead of actual terminal voltage
- Ignoring driver voltage drop (it matters: 1.4V of 6V = 23% loss)
- Allowing current to flow without a complete circuit path
- Hardcoding component IDs (`'driver'`, `'battery'`) — derive from wiring
- Treating motor current and torque as independent (they are coupled via K_t)
