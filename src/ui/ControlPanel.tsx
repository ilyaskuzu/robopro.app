import { useSimulationStore } from '../state/useSimulationStore';

export function ControlPanel() {
  const isRunning = useSimulationStore(s => s.isRunning);
  const speed = useSimulationStore(s => s.speed);
  const tickCount = useSimulationStore(s => s.tickCount);
  const supplyVoltage = useSimulationStore(s => s.supplyVoltage);
  const totalCurrent = useSimulationStore(s => s.totalCurrent);
  const kineticStates = useSimulationStore(s => s.kineticStates);
  const play = useSimulationStore(s => s.play);
  const pause = useSimulationStore(s => s.pause);
  const reset = useSimulationStore(s => s.reset);
  const setSpeed = useSimulationStore(s => s.setSpeed);
  const motorLeft = kineticStates['motor-left'];
  const motorRight = kineticStates['motor-right'];

  const btnStyle = (active: boolean): React.CSSProperties => ({ padding: '6px 20px', background: active ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 });

  return (
    <div style={{ padding: '12px', background: '#12121c', borderTop: '1px solid #2a2a3a', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={isRunning ? pause : play} style={btnStyle(isRunning)}>{isRunning ? 'Pause' : 'Play'}</button>
        <button onClick={reset} style={{ ...btnStyle(false), background: '#444' }}>Reset</button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
        Speed: <input type="range" min={0.25} max={10} step={0.25} value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ width: '80px' }} /> <span style={{ color: '#ccc', minWidth: '30px' }}>{speed}x</span>
      </label>
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
        <span>Tick: {tickCount}</span>
        <span>V: {supplyVoltage.toFixed(2)}V</span>
        <span>I: {(totalCurrent * 1000).toFixed(0)}mA</span>
        {motorLeft && <span>L: {(motorLeft.linearVelocity * 100).toFixed(1)}cm/s</span>}
        {motorRight && <span>R: {(motorRight.linearVelocity * 100).toFixed(1)}cm/s</span>}
      </div>
    </div>
  );
}
