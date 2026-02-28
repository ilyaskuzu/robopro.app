export interface WireConnection { readonly mcuPinIndex: number; readonly componentId: string; readonly componentPinName: string; }
export class WiringGraph {
  private connections: WireConnection[] = [];
  addConnection(m: number, c: string, p: string): void { if (!this.connections.find(x => x.mcuPinIndex === m && x.componentId === c && x.componentPinName === p)) this.connections.push({ mcuPinIndex: m, componentId: c, componentPinName: p }); }
  removeConnection(m: number, c: string, p: string): void { this.connections = this.connections.filter(x => !(x.mcuPinIndex === m && x.componentId === c && x.componentPinName === p)); }
  getConnectionsForComponent(componentId: string): WireConnection[] { return this.connections.filter(c => c.componentId === componentId); }
  getAllConnections(): ReadonlyArray<WireConnection> { return this.connections; }
  clear(): void { this.connections = []; }
}
