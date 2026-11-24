import { create } from 'zustand';

/**
 * 弹层状态（目前只有录入弹窗用）。
 * 单独放 store 是为了让 Android 返回键能在「任意页面」判断有没有弹层要先关。
 */
interface SheetStore {
  open: boolean;
  close: (() => void) | null;
  setSheet: (open: boolean, close?: () => void) => void;
}

export const useSheetStore = create<SheetStore>((set) => ({
  open: false,
  close: null,
  setSheet: (open, close) => set({ open, close: open ? (close ?? null) : null }),
}));
