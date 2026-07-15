import { AdminNav } from "@/components/admin-nav";
import { FlashMessage } from "@/components/flash-message";
import { getFlash } from "@/lib/flash";
import { requireUser } from "@/lib/session";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const flash = getFlash();

  return (
    <div className="min-h-screen bg-field">
      {flash ? <FlashMessage message={flash.message} type={flash.type} /> : null}
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-line bg-white px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <p className="text-lg font-semibold text-ink">LeadScout CRM</p>
            <p className="text-sm text-muted">{user.name}</p>
          </div>
          <AdminNav />
        </aside>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
