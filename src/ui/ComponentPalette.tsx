const AVAILABLE_COMPONENTS = [
  { type: 'dc-motor', name: 'DC Motor (TT 6V)', category: 'Actuators' },
  { type: 'l298n', name: 'L298N Motor Driver', category: 'Drivers' },
  { type: 'hc-sr04', name: 'HC-SR04 Ultrasonic', category: 'Sensors' },
  { type: 'ir-line', name: 'IR Line Sensor', category: 'Sensors' },
  { type: 'encoder', name: 'Rotary Encoder', category: 'Sensors' },
  { type: 'battery-4aa', name: '4xAA Battery Pack', category: 'Power' },
  { type: 'lipo-2s', name: 'LiPo 2S 7.4V', category: 'Power' },
];
const categories = [...new Set(AVAILABLE_COMPONENTS.map(c => c.category))];

export function ComponentPalette() {
  return (
    <div style={{ padding: '10px', background: '#12121c', fontSize: '11px', overflow: 'auto' }}>
      <div style={{ color: '#888', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Components</div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: '10px' }}>
          <div style={{ color: '#555', fontSize: '10px', marginBottom: '4px', fontWeight: 600 }}>{cat}</div>
          {AVAILABLE_COMPONENTS.filter(c => c.category === cat).map(comp => (
            <div key={comp.type} style={{ padding: '5px 8px', background: '#1a1a28', borderRadius: '4px', marginBottom: '3px', color: '#ccc', cursor: 'grab', border: '1px solid transparent', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
              {comp.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
