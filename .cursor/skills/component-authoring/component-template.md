# Component Template

Use this template when creating a new simulated hardware component.

## File Template

```typescript
import { PinDirection, SignalType, type IPinDescriptor } from "../../mcu/interfaces/IPin";
import type { ISensor, IEnvironmentData } from "../interfaces/ISensor"; // or IActuator, IDriver
import { BaseComponent } from "../BaseComponent";

/**
 * [ComponentName] simulation.
 *
 * Datasheet: [Part Number]
 *   Operating voltage: [X]V
 *   [Key spec 1]: [value]
 *   [Key spec 2]: [value]
 *   [Key spec 3]: [value]
 *
 * Model:
 *   [Brief description of the simulation model and equations used]
 */

const PIN_MANIFEST: ReadonlyArray<IPinDescriptor> = [
  {
    id: "PIN_ID",
    label: "Human-Readable Label",
    direction: PinDirection.INPUT, // or OUTPUT, BIDIRECTIONAL
    signalType: SignalType.DIGITAL, // or ANALOG, PWM
    description: "What this pin does",
  },
  // ... more pins
];

export class ComponentName extends BaseComponent implements ISensor {
  readonly category = "sensor" as const; // or "actuator", "driver", "power"

  // Spec-sheet parameters as readonly fields
  readonly someParam: number;

  // Internal state
  private internalState: number = 0;

  constructor(id: string, options?: { someParam?: number }) {
    super(id, "Component Display Name", "sensor", PIN_MANIFEST);
    this.someParam = options?.someParam ?? DEFAULT_VALUE;
  }

  // For sensors: inject environment data
  setEnvironment(data: IEnvironmentData): void {
    if (data.relevantField !== undefined) {
      this.internalState = data.relevantField;
    }
  }

  // For actuators: return mechanical output
  // getOutput(): IActuatorOutput { ... }

  tick(dt: number): void {
    // Read input pins
    const inputPin = this.pin("PIN_ID");

    // Compute based on spec-sheet behavior
    // ...

    // Write output pins
    const outputPin = this.pin("OUTPUT_PIN");
    outputPin.digitalValue = /* computed value */;
  }

  reset(): void {
    this.internalState = 0;
    for (const p of this.pins.values()) {
      p.digitalValue = 0;
      p.analogValue = 0;
      p.pwmDutyCycle = 0;
    }
  }
}
```

## Checklist

- [ ] Class extends `BaseComponent`
- [ ] Implements correct interface (`IActuator`, `ISensor`, `IDriver`, or just `IComponent`)
- [ ] `category` field matches the interface
- [ ] Pin manifest declares all physical pins with correct direction and signal type
- [ ] Constructor accepts `id` and optional spec-sheet params with sane defaults
- [ ] `tick(dt)` is deterministic: same inputs → same outputs
- [ ] `tick(dt)` uses `dt` in seconds (SI)
- [ ] `reset()` restores all state to initial values
- [ ] Datasheet reference in class-level comment
- [ ] No React/Next.js/Three.js imports
- [ ] Registered in `core/simulation/defaultRegistry.ts`
- [ ] Test file created in `tests/core/`

## Where to Place Files

| Category | Directory |
|----------|-----------|
| Motors / Servos | `core/components/motors/` |
| Sensors | `core/components/sensors/` |
| Motor Drivers / Shields | `core/components/drivers/` |
| Batteries / Power | `core/components/power/` |

## Registration

After creating the component, add it to `core/simulation/defaultRegistry.ts`:

```typescript
registry.register({
  typeId: "unique-type-id",
  name: "Display Name",
  category: "sensor",
  description: "One-line description",
  pinManifest: new ComponentName("__template__").pinManifest,
  factory: (id) => new ComponentName(id),
});
```
