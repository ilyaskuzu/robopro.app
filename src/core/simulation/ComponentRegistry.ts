import type { IComponent, PinManifest } from '../components/interfaces/IComponent';
export interface ComponentDescriptor { readonly type: string; readonly category: 'actuator' | 'sensor' | 'driver' | 'power'; readonly displayName: string; readonly pinManifest: PinManifest[]; readonly factory: (id: string) => IComponent; }
export class ComponentRegistry {
  private d = new Map<string, ComponentDescriptor>();
  register(desc: ComponentDescriptor): void { this.d.set(desc.type, desc); }
  get(type: string): ComponentDescriptor | undefined { return this.d.get(type); }
  getAll(): ComponentDescriptor[] { return Array.from(this.d.values()); }
  getByCategory(cat: ComponentDescriptor['category']): ComponentDescriptor[] { return this.getAll().filter(x => x.category === cat); }
  createInstance(type: string, id: string): IComponent { const desc = this.d.get(type); if (!desc) throw new Error(`Unknown: ${type}`); return desc.factory(id); }
}
