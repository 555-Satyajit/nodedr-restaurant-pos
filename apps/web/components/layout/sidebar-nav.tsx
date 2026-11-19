"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@nodedr-restaurant/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({
  user,
  onNavigate,
  collapsed = false,
}: {
  user?: SessionUser;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();

  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "px-2" : "px-3")}>
      {NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission)).map(
        (item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? t(item.labelKey) : undefined}
              aria-label={collapsed ? t(item.labelKey) : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-white/12 text-white font-medium shadow-xs"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon
                className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-white" : "text-white/70")}
                strokeWidth={isActive ? 2.2 : 1.75}
              />
              {!collapsed && <span className={isActive ? "text-white font-medium" : "text-white/85 font-normal"}>{t(item.labelKey)}</span>}
              {badges.nav[item.href] && !isActive ? <NavDot /> : null}
            </Link>
          );
        },
      )}
    </nav>
  );
}
