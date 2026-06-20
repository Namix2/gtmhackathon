import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registeredSourceKeys } from "@/lib/agents/registry";

const sections = [
  {
    href: "/rss",
    title: "RSS Engine",
    description:
      "Discover feeds, ingest content, and review scored GTM signals.",
  },
  {
    href: "/sources",
    title: "Sources",
    description: "Enable platforms and configure discovery settings.",
  },
  {
    href: "/nets",
    title: "Nets",
    description: "Define search parameters and link sources.",
  },
  {
    href: "/candidates",
    title: "Candidates",
    description: "Review raw matches and merge into individuals.",
  },
  {
    href: "/individuals",
    title: "Individuals",
    description: "Canonical people queued for enrichment.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Champion Discovery
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Foundation for finding potential champions across Reddit, X, and
          LinkedIn. Configure nets, review candidates, and dedupe manually into
          canonical individuals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href={section.href}>
                  Open
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent stubs</CardTitle>
          <CardDescription>
            Pluggable discovery agents registered for future implementation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {registeredSourceKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
