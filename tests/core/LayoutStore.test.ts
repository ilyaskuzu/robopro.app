import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore, type AppPage } from '@/lib/stores/useLayoutStore';

describe('useLayoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      page: 'assembly',
      simPanel: 'code',
      shortcutHelpOpen: false,
    });
  });

  it('starts on assembly page', () => {
    const state = useLayoutStore.getState();
    expect(state.page).toBe('assembly');
    expect(state.simPanel).toBe('code');
    expect(state.shortcutHelpOpen).toBe(false);
  });

  it('setPage changes the active page', () => {
    useLayoutStore.getState().setPage('wiring');
    expect(useLayoutStore.getState().page).toBe('wiring');

    useLayoutStore.getState().setPage('simulation');
    expect(useLayoutStore.getState().page).toBe('simulation');
  });

  it('setSimPanel changes the simulation sub-panel', () => {
    useLayoutStore.getState().setSimPanel('drive');
    expect(useLayoutStore.getState().simPanel).toBe('drive');

    useLayoutStore.getState().setSimPanel('environment');
    expect(useLayoutStore.getState().simPanel).toBe('environment');
  });

  it('setShortcutHelpOpen toggles help dialog', () => {
    useLayoutStore.getState().setShortcutHelpOpen(true);
    expect(useLayoutStore.getState().shortcutHelpOpen).toBe(true);

    useLayoutStore.getState().setShortcutHelpOpen(false);
    expect(useLayoutStore.getState().shortcutHelpOpen).toBe(false);
  });

  it('navigates through all page types', () => {
    const pages: AppPage[] = ['assembly', 'wiring', 'simulation'];
    for (const p of pages) {
      useLayoutStore.getState().setPage(p);
      expect(useLayoutStore.getState().page).toBe(p);
    }
  });
});
