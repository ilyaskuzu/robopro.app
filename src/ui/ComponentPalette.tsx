import { useWiringStore, type PlacedComponent } from '../state/useWiringStore';
import { DcMotor, TT_MOTOR_6V } from '../core/components/motors/DcMotor';
import { L298N } from '../core/components/drivers/L298N';
import { BatteryPack, BATTERY_4xAA } from '../core/components/power/BatteryPack';
import { UltrasonicSensor } from '../core/components/sensors/UltrasonicSensor';
import { IrLineSensor } from '../core/components/sensors/IrLineSensor';
import { RotaryEncoder } from '../core/components/sensors/RotaryEncoder';

const AVAILABLE_COMPONENTS = [
  { type: 'dc-motor', name: 'DC Motor (TT 6V)', category: 'Actuators', factory: (id: string) => new DcMotor(id, TT_MOTOR_6V) },
  { type: 'l298n', name: 'L298N Motor Driver', category: 'Drivers', factory: (id: string) => new L298N(id) },
  { type: 'hc-sr04', name: 'HC-SR04 Ultrasonic', category: 'Sensors', factory: (id: string) => new UltrasonicSensor(id) },
  { type: 'ir-line', name: 'IR Line Sensor', category: 'Sensors', factory: (id: string) => new IrLineSensor(id) },
  { type: 'encoder', name: 'Rotary Encoder', category: 'Sensors', factory: (id: string) => new RotaryEncoder(id) },
  { type: 'battery-4aa', name: '4xAA Battery Pack', category: 'Power', factory: (id: string) => new BatteryPack(id, BATTERY_4xAA) },
] as const;

const categories = [...new Set(AVAILABLE_COMPONENTS.map(c => c.category))];

let componentCounter = 0;

export function ComponentPalette() {
  const addComponent = useWiringStore(s => s.addComponent);
  const removeComponent = useWiringStore(s => s.removeComponent);
  const placed = useWiringStore(s => s.placedComponents);

  const handleAdd = (comp: typeof AVAILABLE_COMPONENTS[number]) => {
    componentCounter++;
    const id = `${comp.type}-${componentCounter}`;
    const instance = comp.factory(id);
    const placed: PlacedComponent = {
      id,
      type: comp.type,
      displayName: comp.name,
      instance,
      pinManifest: instance.pinManifest,
    };
    addComponent(placed);
  };

  const isPlaced = (type: string) => placed.some(p => p.type === type);
  const getPlacedByType = (type: string) => placed.filter(p => p.type === type);

  return (
    <div style={{ padding: '10px', background: '#12121c', fontSize: '11px', overflow: 'auto' }}>
      <div style={{ color: '#888', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Components</div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: '10px' }}>
          <div style={{ color: '#555', fontSize: '10px', marginBottom: '4px', fontWeight: 600 }}>{cat}</div>
          {AVAILABLE_COMPONENTS.filter(c => c.category === cat).map(comp => {
            const instances = getPlacedByType(comp.type);
            return (
              <div key={comp.type}>
                <div
                  style={{
                    padding: '5px 8px',
                    background: isPlaced(comp.type) ? '#1a2430' : '#1a1a28',
                    borderRadius: '4px',
                    marginBottom: '2px',
                    color: '#ccc',
                    cursor: 'pointer',
                    border: `1px solid ${isPlaced(comp.type) ? '#2563eb44' : 'transparent'}`,
                    transition: 'all 0.15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = isPlaced(comp.type) ? '#2563eb44' : 'transparent')}
                  onClick={() => handleAdd(comp)}
                >
                  <span>{comp.name}</span>
                  {isPlaced(comp.type) && (
                    <span style={{ color: '#2563eb', fontSize: '10px', fontWeight: 600 }}>
                      {instances.length}×
                    </span>
                  )}
                </div>
                {instances.map(inst => (
                  <div
                    key={inst.id}
                    style={{
                      padding: '3px 8px 3px 16px',
                      fontSize: '10px',
                      color: '#666',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#888' }}>{inst.id}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeComponent(inst.id); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '0 4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
