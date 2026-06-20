import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SourceSetupForm } from "@/components/sources/source-setup-form";
import { LinkedinImport } from "@/components/sources/linkedin-import";
import { getSourceByKey } from "@/lib/actions/sources";
import { sourceKeySchema } from "@/lib/validators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageProps = {
  params: Promise<{ key: string }>;
};

export default async function SourceSetupPage({ params }: PageProps) {
  const { key } = await params;
  const parsedKey = sourceKeySchema.safeParse(key);
  if (!parsedKey.success) notFound();

  const source = await getSourceByKey(parsedKey.data);
  if (!source) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sources">
            <ArrowLeft className="size-4" />
            Sources
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {source.label}
          </h1>
          <Badge variant="outline">{source.key}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure platform settings for this discovery source.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>
            These settings apply whenever this source is linked to a net.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourceSetupForm
            sourceId={source.id}
            sourceKey={parsedKey.data}
            config={source.config}
          />
        </CardContent>
      </Card>

      {parsedKey.data === "linkedin" && <LinkedinImport />}
    </div>
  );
}
