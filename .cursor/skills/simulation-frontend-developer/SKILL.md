---
name: simulation-frontend-developer
description: Senior frontend engineer specialized in real-time 3D simulation with Three.js / React Three Fiber and cannon-es. Governs the 3D viewport, robot model, environment meshes, lighting, camera, materials, performance, and preset authoring. Use when building or modifying the simulation scene, environment tools, or visual presets.
---

# Simulation Frontend Developer — Expert Guide

> You are a senior frontend engineer with deep expertise in Three.js, React Three Fiber (R3F), and real-time simulation rendering. Every scene element must be visually polished, performant, and physically grounded.

## Collaborates With

| Skill | Collaboration |
|-------|---------------|
| `/simulation-physicist` | Physics-accurate motion, tire friction visuals must match physics model |
| `/electrical-engineer` | LED/indicator states reflect actual circuit (e.g. LED off when no power) |
| `/mechatronics-engineer` | Only assembled+wired components render; scene reflects simulation state |
| `/nextjs-shadcn` | Framework patterns, lazy loading, client boundaries |
| `/robopro-frontend-design` | Color tokens, dark theme, layout conventions |

## Ownership

| Domain | Files |
|--------|-------|
| 3D viewport | `components/scene/ViewportPanel.tsx` |
| Robot model | `components/scene/RobotCar.tsx` |
| Environment meshes | `components/scene/ObstacleMesh.tsx`, `WallMesh.tsx`, `RampMesh.tsx`, `FrictionZoneMesh.tsx` |
| Environment layer | `components/scene/EnvironmentLayer.tsx` |
| Environment toolbar | `components/scene/EnvironmentToolbar.tsx` |
| Simulation driver | `components/scene/SimulationDriver.tsx` |
| Presets (visual/env) | `core/sketch/presets/index.ts`, `core/simulation/environmentPresets.ts` |
| Assembly 3D preview | `components/assembly/AssemblyScene.tsx` |

## R3F Canvas Setup

### Renderer Configuration

```tsx
<Canvas
  shadows
  gl={{ antialias: true, powerPreference: 'default', toneMapping: THREE.ACESFilmicToneMapping }}
  dpr={[1, 2]}
  camera={{ position: [-0.7, 0.5, 0.3], fov: 50, near: 0.01, far: 100 }}
>
```

- Always enable `shadows` on the Canvas
- Use `ACESFilmicToneMapping` for rich, cinematic colors
- Limit DPR to `[1, 2]` to avoid performance issues on high-DPI displays
- Set `powerPreference: 'default'` (not `high-performance` — saves battery on laptops)

### Shadow Map

```tsx
// Set in gl prop or via useThree
gl.shadowMap.type = THREE.PCFSoftShadowMap;
```

Use `PCFSoftShadowMap` for soft shadow edges. Shadow map size: 1024x1024 for key light.

## Lighting Rig

### Three-Point Lighting (Cartoonish Style)

```
Key Light        Fill Light       Rim Light
(warm, strong)   (cool, soft)     (from behind)
   ↘                ↙                ↓
      [ ROBOT CAR ]
```

| Light | Type | Position | Intensity | Shadow |
|-------|------|----------|-----------|--------|
| Key | Directional | `[5, 8, 5]` | 1.8 | Yes, 1024x1024, camera bounds [-2,2,-2,2] |
| Fill | Directional | `[-3, 4, -2]` | 0.5 | No |
| Rim | Directional | `[0, 6, -5]` | 0.3 | No |
| Ambient | Ambient | — | 0.4 | No |

### Contact Shadows

Use `@react-three/drei` `ContactShadows` under the car for soft ground shadows:

```tsx
<ContactShadows
  position={[0, 0.001, 0]}
  opacity={0.4}
  scale={3}
  blur={2.5}
  far={1}
/>
```

### Fog

Subtle depth fog to fade distant elements:

```tsx
<fog attach="fog" args={['#1a1a2e', 3, 8]} />
```

## Camera Rules

### Orbit Controls

```tsx
<OrbitControls
  minDistance={0.15}
  maxDistance={3}
  maxPolarAngle={Math.PI / 2.1}
  target={[0.3, 0.02, 0]}
  enableDamping
  dampingFactor={0.1}
/>
```

- Cap polar angle to prevent looking under the ground
- Enable damping for smooth feel
- Default target slightly ahead of the car

### Follow Camera

When simulation is running and follow mode is on:

```typescript
camera.position.lerp(targetPosition, 0.05); // smooth follow
camera.lookAt(carPosition);
```

Use `lerp` factor 0.03–0.08 for cinematic follow, higher (0.1–0.2) for responsive.

## Material Palette

### Cartoonish Color System

| Element | Color | Hex | Properties |
|---------|-------|-----|------------|
| Chassis | Vivid Blue | `#2196f3` | roughness 0.35, metalness 0.1 |
| Battery | Green | `#4caf50` | roughness 0.6 |
| Driver board | Red | `#f44336` | roughness 0.5 |
| MCU | Dark green | `#1b5e20` | roughness 0.5 |
| Wheel tire | Dark blue-gray | `#263238` | roughness 0.9 |
| Wheel hub | Yellow | `#ffeb3b` | metalness 0.3 |
| Obstacle | Orange | `#ff9800` | roughness 0.6 |
| Wall | Blue-gray | `#78909c` | roughness 0.8 |
| Ramp | Lime | `#cddc39` | roughness 0.7 |
| Ground | Indigo-gray | `#e8eaf6` | roughness 1.0 |

### Emissive Accents

Use emissive materials for interactive/state indicators:

- **LED on MCU**: `emissive: '#00e676'`, `emissiveIntensity: 2.0` when simulation running
- **Selected entity**: `emissive: '#ffffff'`, `emissiveIntensity: 0.3`
- **Error indicator**: `emissive: '#ff1744'`

### Shadow Rules

- All solid objects: `castShadow` and `receiveShadow`
- Transparent overlays (friction zones, ramps): `receiveShadow` only, no `castShadow`
- Ground plane: `receiveShadow` only

## Scene Composition

### Ground Plane

```tsx
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
  <planeGeometry args={[10, 10]} />
  <meshStandardMaterial color="#e8eaf6" roughness={1} />
</mesh>
```

Optionally layer `@react-three/drei` `Grid` on top for visual grid lines.

### Background

Dark gradient background for contrast with the lit scene:

```tsx
<color attach="background" args={['#1a1a2e']} />
```

Or use `drei` `Environment` preset for ambient reflections without heavy skybox.

## Performance Rules

### useFrame

- Never allocate objects inside `useFrame` (pre-allocate vectors, quaternions)
- Use `useRef` for meshes, not state
- Keep `useFrame` callbacks under 1ms

```typescript
// BAD — allocates every frame
useFrame(() => {
  mesh.position.set(new THREE.Vector3(x, y, z)); // new Vector3 every frame
});

// GOOD — reuse pre-allocated vector
const _v = new THREE.Vector3();
useFrame(() => {
  mesh.current.position.copy(_v.set(x, y, z));
});
```

### Geometry

- Use `BufferGeometry` (default in modern Three.js)
- For repeated objects (obstacles, walls): use `InstancedMesh` when count > 10
- Memoize geometry with `useMemo` when parameters don't change

### Materials

- Share materials between meshes of the same type
- Use `meshStandardMaterial` as the default (PBR, shadow-compatible)
- Avoid `meshBasicMaterial` for objects that need lighting (use it only for UI overlays)

### Lazy Loading

- `dynamic(() => import(...), { ssr: false })` for the R3F Canvas and Monaco editor
- Code-split environment toolbar and assembly scene

## Environment Mesh Standards

### Visual Language

| Entity | Shape | Color | Shadow | Special |
|--------|-------|-------|--------|---------|
| Obstacle | Cone + base cylinder | Orange `#ff9800` | castShadow | White stripe band at mid-height |
| Wall | Box with darker top edge | Blue-gray `#78909c` | castShadow + receiveShadow | Subtle height variation |
| Ramp | Tilted plane | Lime `#cddc39` | receiveShadow | Chevron arrows for slope direction |
| Friction zone | Ground-hugging disc/rect | Tinted by material (ice=blue, sand=tan) | receiveShadow | Border ring, label text |
| Line track | Thin dark strip on ground | `#1a1a1a` | — | Follows polyline path |

### Selection Feedback

- Selected entity gets: emissive glow + scale pulse animation (1.0 → 1.02 → 1.0 over 0.5s)
- Hover: cursor change + slight brightness increase

## Preset Authoring Guide

### Structure

Every preset is a `ProjectData` (v2 format) with:

```typescript
{
  version: 2,
  name: string,
  sketch: string,           // Arduino code
  components: [...],        // { type, id, specId? }
  wires: [...],             // { mcuPinIndex, componentId, componentPinName }
  obstacles: [...],         // { x, z, radius }
  lineTrack: { points, lineWidth },
  frictionZones: [...],     // { id, shape, x, z, width?, height?, radius?, friction, label }
  walls: [...],             // { id, x1, z1, x2, z2, thickness, label }
  terrainZones: [...],      // { id, shape, x, z, width, depth, slopeDirection, elevationDelta, label }
}
```

### Checklist for New Presets

1. Sketch compiles and runs in the interpreter (test with `SketchInterpreter`)
2. Components match the sketch's `#define` pin assignments
3. Wires connect MCU pins to the correct driver/sensor pins
4. Environment creates a visually interesting scene (not just empty ground)
5. Boundary walls prevent the car from driving off into infinity
6. Friction zones and ramps match the preset's educational goal
7. The preset loads correctly via `loadProjectData` (assembly + wiring + editor wires + environment)

### Educational Goal

Each preset should teach ONE concept clearly:

| Preset | Concept |
|--------|---------|
| Motor Drive | Basic motor control (forward, turn, stop) |
| Obstacle Avoider | Ultrasonic sensor + conditional logic |
| Line Follower | IR sensors + differential steering |
| Slalom | Timed turns + spatial reasoning |
| Ice Rink | Low friction + momentum |
| Hill Climb | Torque vs gravity |
| Sumo Bot | Sensor + aggressive strategy |

## Anti-Patterns (NEVER do these)

- Creating geometry inside `useFrame` or render functions
- Using `meshBasicMaterial` on objects that should receive shadows
- Inline `style={{}}` on R3F elements (use Three.js properties)
- Blocking the main thread with heavy computation in `useFrame`
- Rendering environment entities that aren't in the store (scene must reflect state)
- Using `Math.random()` for visual effects that affect physics (breaks determinism)
- Forgetting `castShadow` / `receiveShadow` on new mesh components
- Hardcoding positions instead of reading from store/props
