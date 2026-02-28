import Editor from '@monaco-editor/react';
import { useState } from 'react';

const DEFAULT_SKETCH = `// ROBOPRO - Arduino Sketch
void setup() {
  pinMode(5, OUTPUT);
  pinMode(6, OUTPUT);
  pinMode(7, OUTPUT);
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
  Serial.begin(9600);
  Serial.println("Robot Car Ready!");
}

void loop() {
  digitalWrite(7, HIGH);
  digitalWrite(8, LOW);
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  analogWrite(5, 200);
  analogWrite(6, 200);
  delay(2000);
  analogWrite(5, 0);
  analogWrite(6, 0);
  delay(1000);
}
`;

interface CodeEditorProps { onCompile?: (code: string) => void; }

export function CodeEditor({ onCompile }: CodeEditorProps) {
  const [code, setCode] = useState(DEFAULT_SKETCH);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#1e1e2e', borderBottom: '1px solid #2a2a3a' }}>
        <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>sketch.ino</span>
        <button onClick={() => onCompile?.(code)} style={{ padding: '4px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Upload</button>
      </div>
      <div style={{ flex: 1 }}>
        <Editor defaultLanguage="cpp" value={code} onChange={(v) => setCode(v ?? '')} theme="vs-dark" options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, tabSize: 2 }} />
      </div>
    </div>
  );
}
