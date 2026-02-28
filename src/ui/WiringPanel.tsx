import { useWiringStore } from '../state/useWiringStore';
import { useMcuStore } from '../state/useMcuStore';

export function WiringPanel() {
  const connections = useWiringStore(s => s.connections);
  const pinStates = useMcuStore(s => s.pinStates);

  return (
    <div style={{ padding: '10px', background: '#12121c', fontSize: '11px', fontFamily: 'monospace', overflow: 'auto' }}>
      <div style={{ color: '#888', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wiring</div>
      {connections.length === 0 ? <div style={{ color: '#444' }}>No connections configured</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {connections.map((conn, i) => {
            const pin = pinStates.find(p => p.index === conn.mcuPinIndex);
            return (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: '#1a1a28', borderRadius: '3px' }}>
              <span style={{ color: '#60a5fa' }}>{pin?.name ?? `Pin ${conn.mcuPinIndex}`}</span>
              <span style={{ color: '#444' }}>&rarr;</span>
              <span style={{ color: '#4ade80' }}>{conn.componentId}.{conn.componentPinName}</span>
            </div>);
          })}
        </div>}
      <div style={{ marginTop: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pin States</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
        {pinStates.slice(0, 14).map(pin => (
          <div key={pin.index} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', fontSize: '10px' }}>
            <span style={{ color: '#888' }}>{pin.name}</span>
            <span style={{ color: pin.value > 0 ? '#4ade80' : '#666', fontWeight: 600 }}>{pin.mode === 'unset' ? '-' : pin.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
