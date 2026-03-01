import { useWiringStore } from '../state/useWiringStore';
import { useMcuStore } from '../state/useMcuStore';
import { useSimulationStore } from '../state/useSimulationStore';

function PinIndicator({ value, mode }: { value: number; mode?: string }) {
  const isPwm = mode === 'pwm' || (value > 0 && value < 1);
  const isHigh = value > 0.5;
  const color = isPwm ? '#3b82f6' : isHigh ? '#22c55e' : '#444';
  const label = isPwm ? `PWM ${Math.round(value * 100)}%` : isHigh ? 'HIGH' : 'LOW';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        boxShadow: isHigh || isPwm ? `0 0 4px ${color}` : 'none',
        transition: 'all 0.15s',
      }} />
      <span style={{ color: '#666', fontSize: '9px', fontFamily: 'monospace' }}>{label}</span>
    </span>
  );
}

export function WiringPanel() {
  const connections = useWiringStore(s => s.connections);
  const placed = useWiringStore(s => s.placedComponents);
  const removeWire = useWiringStore(s => s.removeWire);
  const mcu = useMcuStore(s => s.mcu);
  const componentOutputs = useSimulationStore(s => s.componentOutputs);

  return (
    <div style={{ padding: '10px', background: '#12121c', fontSize: '11px', overflow: 'auto' }}>
      <div style={{ color: '#888', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Wiring ({connections.length})
      </div>

      {connections.length === 0 && (
        <div style={{ color: '#555', fontSize: '10px', fontStyle: 'italic' }}>
          No wires connected. Add components and wire them to MCU pins.
        </div>
      )}

      {connections.map((conn, i) => {
        const mcuPin = mcu?.getPin(conn.mcuPinIndex);
        const compOutputs = componentOutputs[conn.componentId] ?? {};
        const pinValue = compOutputs[conn.componentPinName] ?? mcuPin?.value ?? 0;
        const pinMode = mcuPin?.mode;

        return (
          <div
            key={`${conn.mcuPinIndex}-${conn.componentId}-${conn.componentPinName}-${i}`}
            style={{
              padding: '4px 6px',
              background: '#1a1a28',
              borderRadius: '4px',
              marginBottom: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <span style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '10px', fontWeight: 600, minWidth: '28px' }}>
                D{conn.mcuPinIndex}
              </span>
              <span style={{ color: '#555' }}>→</span>
              <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '10px' }}>
                {conn.componentId}
              </span>
              <span style={{ color: '#888', fontSize: '9px' }}>
                .{conn.componentPinName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PinIndicator value={pinValue} mode={pinMode} />
              <button
                onClick={() => removeWire(conn.mcuPinIndex, conn.componentId, conn.componentPinName)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '9px', padding: '0 2px' }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      {placed.length > 0 && (
        <>
          <div style={{ color: '#888', fontWeight: 600, marginTop: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>
            Components ({placed.length})
          </div>
          {placed.map(comp => (
            <div key={comp.id} style={{ padding: '4px 6px', fontSize: '10px', color: '#888', fontFamily: 'monospace' }}>
              {comp.id} — {comp.pinManifest.map(p => p.name).join(', ')}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
