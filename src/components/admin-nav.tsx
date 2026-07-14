import Link from "next/link";
import { BarChart3, ClipboardList, Database, Settings, Timer } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: ClipboardList },
  { href: "/datensammlung", label: "Datensammlung", icon: Database },
  { href: "/wiedervorlagen", label: "Wiedervorlagen", icon: Timer },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings }
];

export function AdminNav() {
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" size={18} />
            {item.label}
          </Link>
        );
      })}
      <LogoutButton />
    </nav>
  );
}
