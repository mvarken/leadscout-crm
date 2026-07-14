import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";
import { safeRedirectPath } from "@/lib/validation";

type LoginPageProps = {
  searchParams: {
    next?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const next = safeRedirectPath(searchParams.next);

  if (user) {
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-field px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">LeadScout CRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Anmelden</h1>
        </div>
        <LoginForm next={next} />
      </section>
    </main>
  );
}
