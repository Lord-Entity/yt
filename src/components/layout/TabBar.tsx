import { motion } from "motion/react";
import { useActiveCount } from "../../state/downloads";
import { navigate, usePage } from "../../state/nav";
import { Icon } from "../ui/Icon";
import { t } from "../ui/motion";
import { NAV_ITEMS } from "./nav-items";

/** Phone navigation (UI_MOBILE.md): 64px + safe-area inset, 24px icons, 12px labels. */
export function TabBar() {
  const page = usePage();
  const active = useActiveCount();
  return (
    <nav
      aria-label="Main"
      className="safe-bottom shrink-0 border-t border-line bg-sidebar"
    >
      <div className="flex h-16">
        {NAV_ITEMS.map((item) => {
          const on = page === item.page;
          return (
            <motion.button
              key={item.page}
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={t.fast}
              onClick={() => navigate(item.page)}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-[12px] font-medium ${
                on ? "text-accent" : "text-fg-2"
              }`}
            >
              <span className="relative">
                <Icon name={item.icon} size={24} />
                {item.page === "downloads" && active > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-on-accent">
                    {active}
                  </span>
                )}
              </span>
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
