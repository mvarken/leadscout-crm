"use client";

type DeleteLeadButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  leadName: string;
};

export function DeleteLeadButton({ action, leadName }: DeleteLeadButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Lead "${leadName}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <button
        className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        type="submit"
      >
        Loeschen
      </button>
    </form>
  );
}
