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
      <div className="min-h-screen min-w-0">
        <AdminNav userName={user.name} />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
