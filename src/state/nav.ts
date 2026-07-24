import { useEffect } from "react";
import { createStore, useStore } from "./store";

export type Page = "home" | "downloads" | "library" | "settings";
export const PAGES: Page[] = ["home", "downloads", "library", "settings"];
export const PAGE_TITLES: Record<Page, string> = {
  home: "Home",
  downloads: "Downloads",
  library: "Library",
  settings: "Settings",
};

export const navStore = createStore<Page>("home");
export const navigate = (p: Page) => navStore.set(p);
export const usePage = () => useStore(navStore, (p) => p);

/** Cross-component commands raised by keyboard shortcuts and titlebar actions. */
export type Command =
  | "focus-paste"
  | "paste-and-fetch"
  | "download"
  | "focus-library-search"
  | "open-supported-sites"
  | "toggle-sidebar";

const listeners = new Set<(c: Command) => void>();

let pending: { page: Page; command: Command } | null = null;

export function emit(c: Command) {
  for (const l of listeners) l(c);
}

/** Go to a page and deliver the command once that page has mounted. */
export function emitOn(page: Page, c: Command) {
  if (navStore.get() === page) {
    emit(c);
    return;
  }
  pending = { page, command: c };
  navigate(page);
}

export function useCommand(handler: (c: Command) => void, page?: Page) {
  useEffect(() => {
    if (page && pending?.page === page) {
      const c = pending.command;
      pending = null;
      handler(c);
    }
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [handler, page]);
}
