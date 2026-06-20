"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { toggleSourceEnabled } from "@/lib/actions/sources";
import { registeredSourceKeys } from "@/lib/agents/registry";
import { safeConfigSummary } from "@/lib/validators/source-config";
import type { SourceKey } from "@/lib/validators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SourceFormDialog } from "@/components/sources/source-form-dialog";

type SourceRow = {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  config: unknown;
};

// X has no viable no-API path (public access is login-walled), so it is hidden
// from the Add-source picker. Existing X sources still work if an
// X_BEARER_TOKEN is configured.
const HIDDEN_PLATFORMS: SourceKey[] = ["x"];

export function SourceList({ sources }: { sources: SourceRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  const availablePlatforms = useMemo(
    () =>
      registeredSourceKeys.filter(
        (key) =>
          !HIDDEN_PLATFORMS.includes(key as SourceKey) &&
          !sources.some((source) => source.key === key)
      ) as SourceKey[],
    [sources]
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
          <p className="text-muted-foreground text-sm">
            Enable platforms and configure each source on its setup page.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={availablePlatforms.length === 0}
        >
          <Plus className="size-4" />
          Add source
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-muted-foreground">
              No sources yet. Add a platform to get started.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={availablePlatforms.length === 0}
            >
              <Plus className="size-4" />
              Add source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      <SourceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        availablePlatforms={availablePlatforms}
      />
    </>
  );
}

function SourceCard({ source }: { source: SourceRow }) {
  const [isPending, startTransition] = useTransition();
  const summary = safeConfigSummary(source.key, source.config);

  function handleToggle(enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleSourceEnabled(source.id, enabled);
        toast.success(`${source.label} ${enabled ? "enabled" : "disabled"}`);
      } catch {
        toast.error("Failed to update source");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {source.label}
            </CardTitle>
            <CardDescription>{summary}</CardDescription>
          </div>
          <Badge variant="outline">{source.key}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <Label htmlFor={`enabled-${source.id}`}>Enabled</Label>
          <Switch
            id={`enabled-${source.id}`}
            checked={source.enabled}
            disabled={isPending}
            onCheckedChange={handleToggle}
          />
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/sources/${source.key}`}>
            <Settings2 className="size-4" />
            Setup
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
