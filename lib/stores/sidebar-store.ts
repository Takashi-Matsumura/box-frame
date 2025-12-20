import { create } from "zustand";

const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

interface SidebarStore {
  // カスタム幅管理
  width: number;
  setWidth: (width: number) => void;

  // 開閉状態（SidebarProvider外のコンポーネント用）
  open: boolean;
  setOpen: (open: boolean) => void;

  // モーダル状態（他コンポーネントとの連携用）
  isModalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  width: DEFAULT_WIDTH,
  open: true,
  isModalOpen: false,

  setWidth: (width) =>
    set({ width: Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH) }),
  setOpen: (open) => set({ open }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),
}));

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH };
