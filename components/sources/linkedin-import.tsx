"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { importContent } from "@/lib/actions/imports";
import { importContentSchema } from "@/lib/validators";

const PLACEHOLDER = `[
  {
    "handle": "jane-doe",
    "displayName": "Jane Doe",
    "profileUrl": "https://linkedin.com/in/jane-doe",
    "title": "Why AI slop is killing outbound",
    "body": "Full post text here…",
    "url": "https://linkedin.com/posts/jane-doe-123",
    "followers": 8200,
    "likes": 240,
    "comments": 31
  }
]`;

export function LinkedinImport() {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    let rows: unknown;
    try {
      rows = JSON.parse(value);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    const parsed = importContentSchema.safeParse({
      sourceKey: "linkedin",
      rows,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid import data");
      return;
    }

    startTransition(async () => {
      try {
        const result = await importContent(parsed.data);
        toast.success(
          `Imported ${result.candidates} people, ${result.content} posts`
        );
        setValue("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Import failed"
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliant import</CardTitle>
        <CardDescription>
          LinkedIn has no public content API and scraping violates its terms.
          Paste rows from a licensed data provider or manual export (JSON array)
          to bring people and posts into the same pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={10}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDER}
          className="font-mono text-xs"
        />
        <Button onClick={handleImport} disabled={isPending || !value.trim()}>
          <Upload className="size-4" />
          {isPending ? "Importing…" : "Import"}
        </Button>
      </CardContent>
    </Card>
  );
}
