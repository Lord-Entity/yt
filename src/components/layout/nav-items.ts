import type { IconName } from "../ui/Icon";
import type { Page } from "../../state/nav";

export const NAV_ITEMS: { page: Page; label: string; icon: IconName; key: string }[] = [
  { page: "home", label: "Home", icon: "home", key: "1" },
  { page: "downloads", label: "Downloads", icon: "download", key: "2" },
  { page: "library", label: "Library", icon: "library", key: "3" },
  { page: "settings", label: "Settings", icon: "settings", key: "4" },
];
