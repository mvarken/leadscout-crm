import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Hier entsteht in Phase 2 die Leadverwaltung mit Status, Historie, Suche und Duplikatpruefung."
      />
      <PlaceholderPanel
        title="Leadverwaltung vorbereitet"
        text="Diese Seite ist bewusst nur ein Platzhalter. In Phase 1 werden noch keine Lead-Tabellen und keine Lead-Datenbank angelegt."
      />
    </>
  );
}
