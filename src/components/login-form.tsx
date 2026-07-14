"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          next
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Anmeldung fehlgeschlagen.");
        return;
      }

      const body = (await response.json()) as { redirectTo: string };
      router.replace(body.redirectTo);
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="email">
          E-Mail
        </label>
        <input
          className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="password">
          Passwort
        </label>
        <input
          className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Anmeldung laeuft..." : "Anmelden"}
      </button>
    </form>
  );
}
