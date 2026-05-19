import { create } from "zustand";

type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  push(t: Omit<ToastItem, "id">): void;
  dismiss(id: string): void;
}

let _counter = 0;

export const useToastStore = create<ToastState>()((set) => ({
  items: [],

  push(t) {
    const id = String(++_counter);
    set((state) => ({ items: [...state.items, { ...t, id }] }));
  },

  dismiss(id) {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },
}));
