import { describe, it, expect } from 'vitest';
import { ComponentRegistry, type ComponentDescriptor } from '../../core/simulation/ComponentRegistry';
import type { PinManifest, PinValueMap, IComponent } from '../../core/components/interfaces/IComponent';

class StubComponent implements IComponent {
    readonly id: string;
    readonly pinManifest: PinManifest[] = [{ name: 'IN', direction: 'input', signalType: 'digital' }];
    constructor(id: string) { this.id = id; }
    tick(_dt: number, _inputs: PinValueMap): PinValueMap { return {}; }
    reset(): void { }
}

const STUB_DESC: ComponentDescriptor = {
    type: 'stub',
    category: 'sensor',
    displayName: 'Stub Sensor',
    pinManifest: [{ name: 'IN', direction: 'input', signalType: 'digital' }],
    factory: (id: string) => new StubComponent(id),
};

describe('ComponentRegistry', () => {
    it('starts empty', () => {
        const reg = new ComponentRegistry();
        expect(reg.getAll()).toHaveLength(0);
    });

    it('registers and retrieves a descriptor', () => {
        const reg = new ComponentRegistry();
        reg.register(STUB_DESC);
        expect(reg.get('stub')).toBe(STUB_DESC);
    });

    it('returns undefined for unknown type', () => {
        const reg = new ComponentRegistry();
        expect(reg.get('nonexistent')).toBeUndefined();
    });

    it('lists all registered descriptors', () => {
        const reg = new ComponentRegistry();
        reg.register(STUB_DESC);
        reg.register({ ...STUB_DESC, type: 'motor', category: 'actuator', displayName: 'Motor' });
        expect(reg.getAll()).toHaveLength(2);
    });

    it('filters by category', () => {
        const reg = new ComponentRegistry();
        reg.register(STUB_DESC);
        reg.register({ ...STUB_DESC, type: 'motor', category: 'actuator', displayName: 'Motor' });
        expect(reg.getByCategory('sensor')).toHaveLength(1);
        expect(reg.getByCategory('actuator')).toHaveLength(1);
        expect(reg.getByCategory('driver')).toHaveLength(0);
    });

    it('creates an instance via factory', () => {
        const reg = new ComponentRegistry();
        reg.register(STUB_DESC);
        const instance = reg.createInstance('stub', 'my-sensor');
        expect(instance.id).toBe('my-sensor');
        expect(instance.pinManifest).toHaveLength(1);
    });

    it('throws for unknown type in createInstance', () => {
        const reg = new ComponentRegistry();
        expect(() => reg.createInstance('unknown', 'x')).toThrow('Unknown: unknown');
    });

    it('overwrites descriptor with same type', () => {
        const reg = new ComponentRegistry();
        reg.register(STUB_DESC);
        const updated = { ...STUB_DESC, displayName: 'Updated' };
        reg.register(updated);
        expect(reg.get('stub')!.displayName).toBe('Updated');
        expect(reg.getAll()).toHaveLength(1);
    });
});
