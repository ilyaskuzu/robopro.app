"use client";

import { useProjectStore } from '@/lib/stores/useProjectStore';
import { MCU_CATALOG } from '@/core/components/catalog/mcuCatalog';
import { useMcuStore } from '@/lib/stores/useMcuStore';
import { ComponentCard } from './ComponentCard';
import type { BoardType } from '@/core/mcu/McuFactory';

export function McuSelector() {
  const selectedBoardType = useProjectStore(s => s.selectedBoardType);
  const setBoardType = useProjectStore(s => s.setBoardType);
  const initBoard = useMcuStore(s => s.initBoard);

  const handleSelect = (boardType: BoardType) => {
    setBoardType(boardType);
    initBoard(boardType);
  };

  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight px-1">
        MCU Boards
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {MCU_CATALOG.map(mcu => (
          <ComponentCard
            key={mcu.id}
            specId={mcu.id}
            name={mcu.displayName}
            category="mcu"
            selected={selectedBoardType === mcu.boardType}
            onSelect={() => handleSelect(mcu.boardType as BoardType)}
            stats={[
              { label: 'Chip', value: mcu.specs.chipName },
              { label: 'Pins', value: `${mcu.specs.digitalPinCount}D / ${mcu.specs.analogPinCount}A` },
              { label: 'Clock', value: `${mcu.specs.clockHz / 1e6} MHz` },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
