import { useRef, useEffect } from 'react';
import { useMcuStore } from '../state/useMcuStore';

export function SerialMonitor() {
  const serialBuffer = useMcuStore(s => s.serialBuffer);
  const clearSerial = useMcuStore(s => s.clearSerial);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [serialBuffer.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d14' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', background: '#1a1a28', borderBottom: '1px solid #2a2a3a' }}>
        <span style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>SERIAL MONITOR</span>
        <button onClick={clearSerial} style={{ padding: '2px 10px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}>Clear</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
        {serialBuffer.length === 0 ? <span style={{ color: '#444' }}>No serial output yet...</span> : serialBuffer.map((line, i) => <div key={i} style={{ color: '#4ade80' }}>{line}</div>)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
