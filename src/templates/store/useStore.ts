// @ts-nocheck
import { create } from "zustand";

interface State {
  loadedCount: number;
  isReady: boolean;
  images: HTMLImageElement[];
  setLoadedCount: (count: number) => void;
  setIsReady: (ready: boolean) => void;
  setImages: (images: HTMLImageElement[]) => void;
}

export const useStore = create<State>((set) => ({
  loadedCount: 0,
  isReady: false,
  images: [],
  setLoadedCount: (count) => set({ loadedCount: count }),
  setIsReady: (ready) => set({ isReady: ready }),
  setImages: (images) => set({ images }),
}));
