import { SourceList } from "@/components/sources/source-list";
import { getSources } from "@/lib/actions/sources";

export default async function SourcesPage() {
  const sources = await getSources();

  return <SourceList sources={sources} />;
}
