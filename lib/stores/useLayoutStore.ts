import { create } from 'zustand';

export type AppPage = 'assembly' | 'wiring' | 'simulation';
export type SimSubPanel = 'code' | 'drive' | 'environment';

export interface LayoutStoreState {
  page: AppPage;
  simPanel: SimSubPanel;
  shortcutHelpOpen: boolean;

  setPage: (page: AppPage) => void;
  setSimPanel: (panel: SimSubPanel) => void;
  setShortcutHelpOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutStoreState>((set) => ({
  page: 'assembly',
  simPanel: 'code',
  shortcutHelpOpen: false,

  setPage: (page) => set({ page }),
  setSimPanel: (panel) => set({ simPanel: panel }),
  setShortcutHelpOpen: (open) => set({ shortcutHelpOpen: open }),
}));
