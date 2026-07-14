import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function EinstellungenPage() {
  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Administrative Einstellungen und Benutzerverwaltung werden hier spaeter gebuendelt."
      />
      <PlaceholderPanel
        title="Grundsystem aktiv"
        text="Authentifizierung, Rollenmodell und Admin-Seed sind vorhanden. Oeffentliche Registrierung ist nicht implementiert."
      />
    </>
  );
}
