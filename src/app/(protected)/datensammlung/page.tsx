import { PageHeader } from "@/components/page-header";
import { PlaceholderPanel } from "@/components/placeholder-panel";

export default function DatensammlungPage() {
  return (
    <>
      <PageHeader
        title="Datensammlung"
        description="Spaeter werden hier Suchauftraege fuer Quellen wie Branchenverzeichnisse gestartet und ueberwacht."
      />
      <PlaceholderPanel
        title="Datensammlung vorbereitet"
        text="Es gibt noch keinen Scraper, keine 11880-Anbindung und keine Websiteanalyse. Die Seite markiert nur den spaeteren Arbeitsbereich."
      />
    </>
  );
}
