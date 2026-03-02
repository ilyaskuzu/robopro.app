"use client";

import { useCallback } from "react";
import {
  useEnvironmentStore,
  generateEntityId,
  type EnvironmentTool,
} from "@/lib/stores/useEnvironmentStore";
import { FRICTION_MATERIALS } from "@/core/simulation/FrictionMap";

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

interface ToolDef {
  id: EnvironmentTool;
  label: string;
  icon: string;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: "🔍" },
  { id: "place-wall", label: "Wall", icon: "🧱" },
  { id: "place-friction", label: "Surface", icon: "🟫" },
  { id: "place-ramp", label: "Ramp", icon: "📐" },
  { id: "place-obstacle", label: "Obstacle", icon: "⛔" },
];

/* ------------------------------------------------------------------ */
/*  Properties panel                                                   */
/* ------------------------------------------------------------------ */

function SelectedEntityPanel() {
  const selected = useEnvironmentStore((s) => s.selectedEntity);
  const frictionZones = useEnvironmentStore((s) => s.frictionZones);
  const walls = useEnvironmentStore((s) => s.walls);
  const terrainZones = useEnvironmentStore((s) => s.terrainZones);
  const obstacles = useEnvironmentStore((s) => s.obstacles);
  const updateFrictionZone = useEnvironmentStore((s) => s.updateFrictionZone);
  const updateWall = useEnvironmentStore((s) => s.updateWall);
  const updateTerrainZone = useEnvironmentStore((s) => s.updateTerrainZone);
  const updateObstacle = useEnvironmentStore((s) => s.updateObstacle);
  const deleteSelected = useEnvironmentStore((s) => s.deleteSelected);
  const duplicateSelected = useEnvironmentStore((s) => s.duplicateSelected);

  if (!selected) return <div className="text-xs text-gray-400 px-2 py-1">No selection</div>;

  const { type, id } = selected;

  /* ---- Friction zone properties ---- */
  if (type === "friction") {
    const zone = frictionZones.find((z) => z.id === id);
    if (!zone) return null;
    return (
      <div className="space-y-1 text-xs">
        <div className="font-medium text-gray-200">Friction Zone</div>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Label</span>
          <input
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={zone.label}
            onChange={(e) => updateFrictionZone(id, { label: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">μ</span>
          <input
            type="number"
            step={0.05}
            min={0}
            max={3}
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={zone.friction}
            onChange={(e) => updateFrictionZone(id, { friction: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">X</span>
          <input
            type="number"
            step={0.05}
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={zone.x}
            onChange={(e) => updateFrictionZone(id, { x: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Z</span>
          <input
            type="number"
            step={0.05}
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={zone.z}
            onChange={(e) => updateFrictionZone(id, { z: Number(e.target.value) })}
          />
        </label>
        {zone.shape === "rect" && (
          <>
            <label className="flex items-center gap-1">
              <span className="w-12 text-gray-400">W</span>
              <input
                type="number"
                step={0.05}
                min={0.01}
                className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
                value={zone.width ?? 0.2}
                onChange={(e) => updateFrictionZone(id, { width: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="w-12 text-gray-400">H</span>
              <input
                type="number"
                step={0.05}
                min={0.01}
                className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
                value={zone.height ?? 0.2}
                onChange={(e) => updateFrictionZone(id, { height: Number(e.target.value) })}
              />
            </label>
          </>
        )}
        {zone.shape === "circle" && (
          <label className="flex items-center gap-1">
            <span className="w-12 text-gray-400">R</span>
            <input
              type="number"
              step={0.01}
              min={0.01}
              className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
              value={zone.radius ?? 0.1}
              onChange={(e) => updateFrictionZone(id, { radius: Number(e.target.value) })}
            />
          </label>
        )}
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Mat.</span>
          <select
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={
              Object.entries(FRICTION_MATERIALS).find(([, v]) => v === zone.friction)?.[0] ?? ""
            }
            onChange={(e) => {
              const mu = FRICTION_MATERIALS[e.target.value];
              if (mu !== undefined) updateFrictionZone(id, { friction: mu, label: e.target.value });
            }}
          >
            <option value="">Custom</option>
            {Object.entries(FRICTION_MATERIALS).map(([name, mu]) => (
              <option key={name} value={name}>
                {name} (μ={mu})
              </option>
            ))}
          </select>
        </label>
        <ActionButtons onDelete={deleteSelected} onDuplicate={duplicateSelected} />
      </div>
    );
  }

  /* ---- Wall properties ---- */
  if (type === "wall") {
    const wall = walls.find((w) => w.id === id);
    if (!wall) return null;
    return (
      <div className="space-y-1 text-xs">
        <div className="font-medium text-gray-200">Wall</div>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Label</span>
          <input
            className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white"
            value={wall.label}
            onChange={(e) => updateWall(id, { label: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-1">
          <label className="flex items-center gap-1">
            <span className="w-6 text-gray-400">X1</span>
            <input type="number" step={0.05} className="w-full bg-gray-700 rounded px-1 py-0.5 text-white" value={wall.x1} onChange={(e) => updateWall(id, { x1: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-1">
            <span className="w-6 text-gray-400">Z1</span>
            <input type="number" step={0.05} className="w-full bg-gray-700 rounded px-1 py-0.5 text-white" value={wall.z1} onChange={(e) => updateWall(id, { z1: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-1">
            <span className="w-6 text-gray-400">X2</span>
            <input type="number" step={0.05} className="w-full bg-gray-700 rounded px-1 py-0.5 text-white" value={wall.x2} onChange={(e) => updateWall(id, { x2: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-1">
            <span className="w-6 text-gray-400">Z2</span>
            <input type="number" step={0.05} className="w-full bg-gray-700 rounded px-1 py-0.5 text-white" value={wall.z2} onChange={(e) => updateWall(id, { z2: Number(e.target.value) })} />
          </label>
        </div>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Thick</span>
          <input type="number" step={0.005} min={0.005} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={wall.thickness} onChange={(e) => updateWall(id, { thickness: Number(e.target.value) })} />
        </label>
        <ActionButtons onDelete={deleteSelected} onDuplicate={duplicateSelected} />
      </div>
    );
  }

  /* ---- Ramp properties ---- */
  if (type === "ramp") {
    const zone = terrainZones.find((z) => z.id === id);
    if (!zone) return null;
    return (
      <div className="space-y-1 text-xs">
        <div className="font-medium text-gray-200">Ramp</div>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Label</span>
          <input className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.label} onChange={(e) => updateTerrainZone(id, { label: e.target.value })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">X</span>
          <input type="number" step={0.05} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.x} onChange={(e) => updateTerrainZone(id, { x: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Z</span>
          <input type="number" step={0.05} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.z} onChange={(e) => updateTerrainZone(id, { z: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Width</span>
          <input type="number" step={0.05} min={0.01} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.width} onChange={(e) => updateTerrainZone(id, { width: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Depth</span>
          <input type="number" step={0.05} min={0.01} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.depth} onChange={(e) => updateTerrainZone(id, { depth: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Δ Elev</span>
          <input type="number" step={0.01} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={zone.elevationDelta} onChange={(e) => updateTerrainZone(id, { elevationDelta: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Dir °</span>
          <input type="number" step={15} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={Math.round((zone.slopeDirection * 180) / Math.PI)} onChange={(e) => updateTerrainZone(id, { slopeDirection: (Number(e.target.value) * Math.PI) / 180 })} />
        </label>
        <ActionButtons onDelete={deleteSelected} onDuplicate={duplicateSelected} />
      </div>
    );
  }

  /* ---- Obstacle properties ---- */
  if (type === "obstacle") {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return null;
    return (
      <div className="space-y-1 text-xs">
        <div className="font-medium text-gray-200">Obstacle</div>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Label</span>
          <input className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={obs.label} onChange={(e) => updateObstacle(id, { label: e.target.value })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">X</span>
          <input type="number" step={0.05} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={obs.x} onChange={(e) => updateObstacle(id, { x: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Z</span>
          <input type="number" step={0.05} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={obs.z} onChange={(e) => updateObstacle(id, { z: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-1">
          <span className="w-12 text-gray-400">Radius</span>
          <input type="number" step={0.01} min={0.01} className="flex-1 bg-gray-700 rounded px-1 py-0.5 text-white" value={obs.radius} onChange={(e) => updateObstacle(id, { radius: Number(e.target.value) })} />
        </label>
        <ActionButtons onDelete={deleteSelected} onDuplicate={duplicateSelected} />
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Action buttons                                                     */
/* ------------------------------------------------------------------ */

function ActionButtons({ onDelete, onDuplicate }: { onDelete: () => void; onDuplicate: () => void }) {
  return (
    <div className="flex gap-1 pt-1">
      <button
        className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded px-2 py-0.5 text-xs"
        onClick={onDelete}
      >
        Delete
      </button>
      <button
        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-2 py-0.5 text-xs"
        onClick={onDuplicate}
      >
        Duplicate
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main toolbar                                                       */
/* ------------------------------------------------------------------ */

export function EnvironmentToolbar() {
  const activeTool = useEnvironmentStore((s) => s.activeTool);
  const setActiveTool = useEnvironmentStore((s) => s.setActiveTool);
  const snapToGrid = useEnvironmentStore((s) => s.snapToGrid);
  const setSnapToGrid = useEnvironmentStore((s) => s.setSnapToGrid);
  const addFrictionZone = useEnvironmentStore((s) => s.addFrictionZone);
  const addWall = useEnvironmentStore((s) => s.addWall);
  const addTerrainZone = useEnvironmentStore((s) => s.addTerrainZone);
  const addObstacle = useEnvironmentStore((s) => s.addObstacle);
  const selectEntity = useEnvironmentStore((s) => s.selectEntity);

  const handleToolClick = useCallback(
    (tool: EnvironmentTool) => {
      setActiveTool(tool);

      // Instant-place a default entity for non-select tools
      if (tool === "place-friction") {
        const id = generateEntityId("fz");
        addFrictionZone({
          id,
          shape: "rect",
          x: 0.3,
          z: 0,
          width: 0.2,
          height: 0.2,
          friction: 0.4,
          label: "wood",
          priority: 1,
        });
        selectEntity({ type: "friction", id });
        setActiveTool("select");
      } else if (tool === "place-wall") {
        const id = generateEntityId("wall");
        addWall({
          id,
          x1: 0.5,
          z1: -0.15,
          x2: 0.5,
          z2: 0.15,
          thickness: 0.01,
          label: "Wall",
        });
        selectEntity({ type: "wall", id });
        setActiveTool("select");
      } else if (tool === "place-ramp") {
        const id = generateEntityId("ramp");
        addTerrainZone({
          id,
          shape: "ramp",
          x: 0.4,
          z: 0,
          width: 0.2,
          depth: 0.2,
          slopeDirection: 0,
          elevationDelta: 0.05,
          label: "Ramp",
        });
        selectEntity({ type: "ramp", id });
        setActiveTool("select");
      } else if (tool === "place-obstacle") {
        const id = generateEntityId("obs");
        addObstacle({
          id,
          x: 0.6,
          z: 0,
          radius: 0.03,
          label: "Obstacle",
        });
        selectEntity({ type: "obstacle", id });
        setActiveTool("select");
      }
    },
    [setActiveTool, addFrictionZone, addWall, addTerrainZone, addObstacle, selectEntity],
  );

  return (
    <div className="absolute top-2 right-2 bg-gray-800/90 rounded-lg shadow-lg p-2 flex flex-col gap-2 z-10 min-w-35">
      {/* Tool buttons */}
      <div className="flex gap-1 flex-wrap">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`px-2 py-1 rounded text-xs ${
              activeTool === tool.id
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => handleToolClick(tool.id)}
            title={tool.label}
          >
            <span className="mr-1">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Snap toggle */}
      <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
          className="rounded"
        />
        Snap to grid
      </label>

      {/* Properties panel */}
      <div className="border-t border-gray-700 pt-1">
        <SelectedEntityPanel />
      </div>
    </div>
  );
}
