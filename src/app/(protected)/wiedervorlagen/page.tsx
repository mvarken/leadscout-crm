import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function WiedervorlagenPage() {
  return (
    <>
      <PageHeader
        title="Wiedervorlagen"
        description="In einer spaeteren Phase erscheinen hier Nachfass-Termine, Aufgaben und erneute Pruefungen."
      />
      <PlaceholderPanel
        title="Wiedervorlagen vorbereitet"
        text="Der Bereich ist fuer den naechsten Ausbau sichtbar, ohne schon unfertige Aufgabenlogik einzubauen."
      />
    </>
  );
}
