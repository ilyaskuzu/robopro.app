"use client";

import Editor from "@monaco-editor/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import { useMcuStore } from "@/lib/stores/useMcuStore";
import { useSimulationStore } from "@/lib/stores/useSimulationStore";

const DEFAULT_SKETCH = `// ROBOPRO - Arduino Sketch
// L298N H-Bridge wiring: D5->ENA, D6->ENB, D7->IN1, D8->IN2, D9->IN3, D10->IN4
// ENA/ENB = PWM speed; IN1-IN4 = direction per motor

void setup() {
  // Configure all L298N control pins as outputs
  pinMode(5, OUTPUT);   // ENA: PWM enable for left motor (0-255 = speed)
  pinMode(6, OUTPUT);   // ENB: PWM enable for right motor (0-255 = speed)
  pinMode(7, OUTPUT);   // IN1: Left motor direction A (with IN2: H/L=forward, L/H=backward)
  pinMode(8, OUTPUT);   // IN2: Left motor direction B
  pinMode(9, OUTPUT);   // IN3: Right motor direction A (with IN4: H/L=forward, L/H=backward)
  pinMode(10, OUTPUT); // IN4: Right motor direction B
  Serial.begin(9600);
  Serial.println("Robot Car Ready!");
}

void loop() {
  // --- FORWARD (2000ms) ---
  // Set direction: IN1=H, IN2=L and IN3=H, IN4=L drives both motors forward
  digitalWrite(7, HIGH);
  digitalWrite(8, LOW);
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  // Set speed: analogWrite 200/255 ≈ 78% duty cycle
  analogWrite(5, 200);
  analogWrite(6, 200);
  delay(2000);

  // --- STOP (1000ms) ---
  // Disable both motors by setting ENA and ENB to 0 (direction pins ignored when disabled)
  analogWrite(5, 0);
  analogWrite(6, 0);
  delay(1000);

  // --- PIVOT TURN LEFT (~90°) ---
  // Left wheel backward + Right wheel forward = pivot in place (turn left)
  // Left:  IN1=L, IN2=H (backward) | Right: IN3=H, IN4=L (forward)
  digitalWrite(7, LOW);
  digitalWrite(8, HIGH);
  digitalWrite(9, HIGH);
  digitalWrite(10, LOW);
  analogWrite(5, 49);
  analogWrite(6, 49);
  delay(455);

  // --- STOP (1000ms) ---
  analogWrite(5, 0);
  analogWrite(6, 0);
  delay(1000);
}
`;

export function CodeEditorPanel() {
  const storeSketch = useSimulationStore((s) => s.sketchSource);
  const [code, setCode] = useState(storeSketch || DEFAULT_SKETCH);
  const appendSerial = useMcuStore((s) => s.appendSerial);
  const loadSketch = useSimulationStore((s) => s.loadSketch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced sketch parsing — 300ms after user stops typing
  const debouncedLoadSketch = useCallback((source: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadSketch(source), 300);
  }, [loadSketch]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Sync editor with store (Presets/Load)
  useEffect(() => {
    if (storeSketch !== undefined && storeSketch !== code) {
      setCode(storeSketch);
    }
  }, [storeSketch]);

  const handleUpload = () => {
    loadSketch(code);
    appendSerial("> Sketch loaded into interpreter.");
    appendSerial("> Press Run to execute.");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 bg-muted/50">
        <span className="text-xs font-mono text-muted-foreground">sketch.ino</span>
        <button
          onClick={handleUpload}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          defaultLanguage="cpp"
          value={code}
          onChange={(v) => { setCode(v ?? ""); debouncedLoadSketch(v ?? ""); }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
