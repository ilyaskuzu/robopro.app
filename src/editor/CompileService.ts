export interface CompileResult { success: boolean; hex?: Uint8Array; errors?: string[]; }

export async function compileSketch(_source: string): Promise<CompileResult> {
  return { success: false, errors: ['Compilation service not yet connected.', 'To enable: integrate Arduino CLI or connect to a cloud compile endpoint.'] };
}
