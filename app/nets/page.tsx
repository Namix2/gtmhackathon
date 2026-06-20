import { NetList } from "@/components/nets/net-list";
import { getAllSourcesForNets, getNets } from "@/lib/actions/nets";

export default async function NetsPage() {
  const [nets, sources] = await Promise.all([
    getNets(),
    getAllSourcesForNets(),
  ]);

  return <NetList nets={nets} sources={sources} />;
}
