import { useState } from 'react';
import { SimulationScene } from '../scene/SimulationScene';
import { CodeEditor } from '../editor/CodeEditor';
import { SerialMonitor } from './SerialMonitor';
import { ControlPanel } from './ControlPanel';
import { WiringPanel } from './WiringPanel';
import { ComponentPalette } from './ComponentPalette';
import { useMcuStore } from '../state/useMcuStore';
import { useSimulationStore } from '../state/useSimulationStore';
import { useWiringStore } from '../state/useWiringStore';
import { serializeProject, deserializeProject, downloadProject, openProjectFile, type ProjectData } from '../core/simulation/ProjectSerializer';
import { PRESETS, PRESET_NAMES } from '../core/sketch/presets';
import { DcMotor, TT_MOTOR_6V } from '../core/components/motors/DcMotor';
import { L298N } from '../core/components/drivers/L298N';
import { BatteryPack, BATTERY_4xAA } from '../core/components/power/BatteryPack';
import { UltrasonicSensor } from '../core/components/sensors/UltrasonicSensor';
import { IrLineSensor } from '../core/components/sensors/IrLineSensor';
import { RotaryEncoder } from '../core/components/sensors/RotaryEncoder';
import type { IComponent } from '../core/components/interfaces/IComponent';

// Factory map: component type → constructor
function createComponent(type: string, id: string): IComponent | null {
  switch (type) {
    case 'dc-motor': return new DcMotor(id, TT_MOTOR_6V);
    case 'l298n': return new L298N(id);
    case 'battery-4aa': return new BatteryPack(id, BATTERY_4xAA);
    case 'hc-sr04': return new UltrasonicSensor(id);
    case 'ir-line': return new IrLineSensor(id);
    case 'encoder': return new RotaryEncoder(id);
    default: return null;
  }
}

function loadProjectData(data: ProjectData) {
  const { clearAll, addComponent, addWire } = useWiringStore.getState();
  const { obstacleWorld, lineTrack, loadSketch } = useSimulationStore.getState();

  clearAll();

  // Add components
  for (const comp of data.components) {
    const instance = createComponent(comp.type, comp.id);
    if (instance) {
      addComponent({
        id: comp.id,
        type: comp.type,
        displayName: comp.type,
        instance,
        pinManifest: instance.pinManifest,
      });
    }
  }

  // Add wires
  for (const wire of data.wires) {
    addWire(wire.mcuPinIndex, wire.componentId, wire.componentPinName);
  }

  // Set obstacles
  obstacleWorld.clear();
  for (const obs of data.obstacles) {
    obstacleWorld.addObstacle(obs);
  }

  // Set line track
  lineTrack.clear();
  if (data.lineTrack?.points?.length > 0) {
    lineTrack.setPoints(data.lineTrack.points);
    lineTrack.setLineWidth(data.lineTrack.lineWidth);
  }

  // Load sketch
  loadSketch(data.sketch);
}

export function Layout() {
  const appendSerial = useMcuStore(s => s.appendSerial);
  const [showPresets, setShowPresets] = useState(false);

  const handleSave = () => {
    const { placedComponents, connections } = useWiringStore.getState();
    const { sketchSource, obstacleWorld, lineTrack } = useSimulationStore.getState();
    const json = serializeProject(
      'robopro-project',
      sketchSource,
      placedComponents.map(c => ({ type: c.type, id: c.id })),
      connections,
      obstacleWorld.getObstacles(),
      lineTrack.getPoints(),
      lineTrack.getLineWidth(),
    );
    downloadProject(json, 'robopro-project.json');
    appendSerial('> Project saved.');
  };

  const handleLoad = async () => {
    try {
      const json = await openProjectFile();
      const data = deserializeProject(json);
      loadProjectData(data);
      appendSerial(`> Loaded project: ${data.name}`);
    } catch (err) {
      appendSerial(`> Load error: ${err}`);
    }
  };

  const handlePreset = (name: string) => {
    const data = PRESETS[name as keyof typeof PRESETS];
    if (data) {
      loadProjectData(data);
      appendSerial(`> Loaded preset: ${data.name}`);
    }
    setShowPresets(false);
  };

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    background: '#1e1e2e',
    color: '#aaa',
    border: '1px solid #333',
    borderRadius: '3px',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', gridTemplateRows: 'auto 1fr auto', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px', padding: '6px 12px', background: '#0e0e18', borderBottom: '1px solid #2a2a3a', alignItems: 'center' }}>
        <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '13px', marginRight: '12px' }}>ROBOPRO</span>
        <button onClick={handleSave} style={toolbarBtnStyle}>💾 Save</button>
        <button onClick={handleLoad} style={toolbarBtnStyle}>📂 Load</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowPresets(!showPresets)} style={toolbarBtnStyle}>📋 Presets</button>
          {showPresets && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: '#1a1a28',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '4px',
              zIndex: 100,
              minWidth: '180px',
              marginTop: '2px',
            }}>
              {PRESET_NAMES.map(name => (
                <div
                  key={name}
                  onClick={() => handlePreset(name)}
                  style={{
                    padding: '6px 10px',
                    color: '#ccc',
                    fontSize: '11px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2563eb33')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {PRESETS[name].name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left panel: Components + Wiring */}
      <div style={{ gridRow: '2 / 3', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a3a', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 auto', maxHeight: '45%', overflow: 'auto' }}><ComponentPalette /></div>
        <div style={{ flex: 1, borderTop: '1px solid #2a2a3a', overflow: 'auto' }}><WiringPanel /></div>
      </div>

      {/* Center: 3D Viewport */}
      <div style={{ gridRow: '2 / 3', position: 'relative', overflow: 'hidden' }}><SimulationScene /></div>

      {/* Right panel: Code Editor + Serial */}
      <div style={{ gridRow: '2 / 3', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a3a', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0 }}><CodeEditor /></div>
        <div style={{ height: '180px', borderTop: '1px solid #2a2a3a', overflow: 'hidden' }}><SerialMonitor /></div>
      </div>

      {/* Bottom: Control Panel */}
      <div style={{ gridColumn: '1 / -1' }}><ControlPanel /></div>
    </div>
  );
}
