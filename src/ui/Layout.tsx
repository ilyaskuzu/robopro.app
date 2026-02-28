import { SimulationScene } from '../scene/SimulationScene';
import { CodeEditor } from '../editor/CodeEditor';
import { SerialMonitor } from './SerialMonitor';
import { ControlPanel } from './ControlPanel';
import { WiringPanel } from './WiringPanel';
import { ComponentPalette } from './ComponentPalette';
import { compileSketch } from '../editor/CompileService';
import { useMcuStore } from '../state/useMcuStore';

export function Layout() {
  const appendSerial = useMcuStore(s => s.appendSerial);

  const handleCompile = async (code: string) => {
    appendSerial('> Compiling sketch...');
    const result = await compileSketch(code);
    if (result.success && result.hex) {
      appendSerial('> Compilation successful. Uploading...');
      useMcuStore.getState().loadFirmware(result.hex);
      appendSerial('> Firmware uploaded.');
    } else {
      for (const err of result.errors ?? []) appendSerial(`> ERROR: ${err}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', gridTemplateRows: '1fr auto', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ gridRow: '1 / 3', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a3a', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 auto', maxHeight: '45%', overflow: 'auto' }}><ComponentPalette /></div>
        <div style={{ flex: 1, borderTop: '1px solid #2a2a3a', overflow: 'auto' }}><WiringPanel /></div>
      </div>
      <div style={{ position: 'relative', overflow: 'hidden' }}><SimulationScene /></div>
      <div style={{ gridRow: '1 / 2', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a3a', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0 }}><CodeEditor onCompile={handleCompile} /></div>
        <div style={{ height: '180px', borderTop: '1px solid #2a2a3a', overflow: 'hidden' }}><SerialMonitor /></div>
      </div>
      <div style={{ gridColumn: '2 / 4' }}><ControlPanel /></div>
    </div>
  );
}
