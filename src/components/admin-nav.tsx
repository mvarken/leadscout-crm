"use client";

import Link from "next/link";
import { BarChart3, ClipboardList, Database, Mail, Menu, Settings, Timer, X } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: ClipboardList },
  { href: "/datensammlung", label: "Datensammlung", icon: Database },
  { href: "/wiedervorlagen", label: "Wiedervorlagen", icon: Timer },
  { href: "/kommunikation", label: "Kommunikation", icon: Mail },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings }
];

type AdminNavProps = {
  userName: string;
};

export function AdminNav({ userName }: AdminNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">LeadScout CRM</p>
            <p className="truncate text-xs text-muted">{userName}</p>
          </div>
          <button
            aria-expanded={open}
            aria-controls="admin-menu"
            aria-label={open ? "Menue schliessen" : "Menue oeffnen"}
            className="rounded-md border border-line p-2 text-ink hover:bg-field"
            type="button"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </header>

      {open ? (
        <button
          aria-label="Menue schliessen"
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          type="button"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="admin-menu"
        className={`fixed bottom-0 left-0 top-0 z-50 w-[min(280px,calc(100vw-24px))] border-r border-line bg-white px-4 py-4 shadow-xl transition-transform duration-200 lg:top-[57px] lg:z-30 lg:shadow-sm ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink">LeadScout CRM</p>
            <p className="truncate text-sm text-muted">{userName}</p>
          </div>
          <button
            aria-label="Menue schliessen"
            className="rounded-md border border-line p-2 text-ink hover:bg-field"
            type="button"
            onClick={() => setOpen(false)}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={18} />
                {item.label}
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
      </aside>
    </>
  );
}
