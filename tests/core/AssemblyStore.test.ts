import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore } from '@/lib/stores/useAssemblyStore';

describe('useAssemblyStore', () => {
  beforeEach(() => {
    useAssemblyStore.setState({ placements: [], selectedId: null });
  });

  it('adding components increments placements', () => {
    const { addComponent, placements } = useAssemblyStore.getState();
    expect(placements).toHaveLength(0);

    addComponent('arduino-uno', 'mcu');
    expect(useAssemblyStore.getState().placements).toHaveLength(1);

    addComponent('l298n', 'driver');
    expect(useAssemblyStore.getState().placements).toHaveLength(2);

    addComponent('tt-motor-6v', 'dc-motor');
    expect(useAssemblyStore.getState().placements).toHaveLength(3);
  });

  it('addComponent generates unique IDs and default positions', () => {
    const { addComponent } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');

    const [mcu, driver] = useAssemblyStore.getState().placements;
    expect(mcu.id).toMatch(/^mcu-\d+$/);
    expect(driver.id).toMatch(/^driver-\d+$/);
    expect(mcu.catalogId).toBe('arduino-uno');
    expect(driver.catalogId).toBe('l298n');
    expect(mcu.position).toEqual({ x: 0, y: 0 });
    expect(driver.position).toEqual({ x: 60, y: 0 });
  });

  it('removing components works', () => {
    const { addComponent, removeComponent } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    const mcuId = useAssemblyStore.getState().placements[0].id;

    removeComponent(mcuId);
    expect(useAssemblyStore.getState().placements).toHaveLength(1);
    expect(useAssemblyStore.getState().placements[0].catalogId).toBe('l298n');
  });

  it('removeComponent clears connections to/from the removed component', () => {
    const { addComponent, connectComponents, removeComponent } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    addComponent('tt-motor-6v', 'dc-motor');
    const [mcu, driver] = useAssemblyStore.getState().placements;

    connectComponents(mcu.id, 'D5', driver.id, 'ENA');
    connectComponents(driver.id, 'OUT1', mcu.id, 'IN1');
    expect(useAssemblyStore.getState().placements[0].connections).toHaveLength(1);
    expect(useAssemblyStore.getState().placements[1].connections).toHaveLength(1);

    removeComponent(mcu.id);
    const remaining = useAssemblyStore.getState().placements;
    expect(remaining.find((p) => p.id === driver.id)?.connections).toHaveLength(0);
  });

  it('moving components updates position', () => {
    const { addComponent, moveComponent } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    const id = useAssemblyStore.getState().placements[0].id;

    moveComponent(id, { x: 100, y: 50 });
    expect(useAssemblyStore.getState().placements[0].position).toEqual({ x: 100, y: 50 });
  });

  it('connecting components creates connections', () => {
    const { addComponent, connectComponents } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    const [mcu, driver] = useAssemblyStore.getState().placements;

    connectComponents(mcu.id, 'D5', driver.id, 'ENA');
    const fromPlacement = useAssemblyStore.getState().placements.find((p) => p.id === mcu.id);
    expect(fromPlacement?.connections).toHaveLength(1);
    expect(fromPlacement?.connections[0]).toEqual({
      fromZone: 'D5',
      toComponentId: driver.id,
      toZone: 'ENA',
    });
  });

  it('disconnectComponents removes connection between two components', () => {
    const { addComponent, connectComponents, disconnectComponents } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    const [mcu, driver] = useAssemblyStore.getState().placements;

    connectComponents(mcu.id, 'D5', driver.id, 'ENA');
    expect(useAssemblyStore.getState().placements[0].connections).toHaveLength(1);

    disconnectComponents(mcu.id, driver.id);
    expect(useAssemblyStore.getState().placements[0].connections).toHaveLength(0);
  });

  it('getByCategory filters correctly', () => {
    const { addComponent, getByCategory } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    addComponent('tt-motor-6v', 'dc-motor');
    addComponent('tt-motor-6v', 'dc-motor');

    expect(getByCategory('mcu')).toHaveLength(1);
    expect(getByCategory('driver')).toHaveLength(1);
    expect(getByCategory('dc-motor')).toHaveLength(2);
    expect(getByCategory('battery')).toHaveLength(0);
  });

  it('isReadyForWiring checks MCU + driver + motor requirement', () => {
    const { addComponent, isReadyForWiring } = useAssemblyStore.getState();

    expect(isReadyForWiring()).toBe(false);

    addComponent('arduino-uno', 'mcu');
    expect(isReadyForWiring()).toBe(false);

    addComponent('l298n', 'driver');
    expect(isReadyForWiring()).toBe(false);

    addComponent('tt-motor-6v', 'dc-motor');
    expect(isReadyForWiring()).toBe(true);
  });

  it('isReadyForWiring accepts stepper as motor', () => {
    const { addComponent, isReadyForWiring } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    addComponent('28byj-48', 'stepper');
    expect(isReadyForWiring()).toBe(true);
  });

  it('clearAll empties everything', () => {
    const { addComponent, clearAll } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    addComponent('l298n', 'driver');
    useAssemblyStore.getState().selectComponent(useAssemblyStore.getState().placements[0].id);

    clearAll();
    expect(useAssemblyStore.getState().placements).toHaveLength(0);
    expect(useAssemblyStore.getState().selectedId).toBe(null);
  });

  it('selectComponent updates selectedId', () => {
    const { addComponent, selectComponent } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    const id = useAssemblyStore.getState().placements[0].id;

    selectComponent(id);
    expect(useAssemblyStore.getState().selectedId).toBe(id);

    selectComponent(null);
    expect(useAssemblyStore.getState().selectedId).toBe(null);
  });

  it('getMcuPlacement returns first MCU', () => {
    const { addComponent, getMcuPlacement } = useAssemblyStore.getState();
    addComponent('arduino-uno', 'mcu');
    expect(getMcuPlacement()?.category).toBe('mcu');
  });

  it('getDriverPlacement returns first driver', () => {
    const { addComponent, getDriverPlacement } = useAssemblyStore.getState();
    addComponent('l298n', 'driver');
    expect(getDriverPlacement()?.category).toBe('driver');
  });

  it('getBatteryPlacement returns first battery', () => {
    const { addComponent, getBatteryPlacement } = useAssemblyStore.getState();
    addComponent('4xaa-alkaline', 'battery');
    expect(getBatteryPlacement()?.category).toBe('battery');
  });

  it('getMotorPlacements returns dc-motor and stepper', () => {
    const { addComponent, getMotorPlacements } = useAssemblyStore.getState();
    addComponent('tt-motor-6v', 'dc-motor');
    addComponent('28byj-48', 'stepper');
    const motors = getMotorPlacements();
    expect(motors).toHaveLength(2);
    expect(motors.map((m) => m.category).sort()).toEqual(['dc-motor', 'stepper']);
  });
});
