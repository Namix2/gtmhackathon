"use client";

import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateSourceConfig } from "@/lib/actions/sources";
import type { SourceKey } from "@/lib/validators";
import {
  defaultSourceConfig,
  linkedinConfigSchema,
  parseSourceConfig,
  redditConfigSchema,
  rssConfigSchema,
  xConfigSchema,
  type LinkedinConfigValues,
  type RedditConfigValues,
  type RssConfigValues,
  type XConfigValues,
} from "@/lib/validators/source-config";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SourceSetupFormProps = {
  sourceId: string;
  sourceKey: SourceKey;
  config: unknown;
};

type SetupMeta = {
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  emptyHint: string;
};

const setupMeta: Record<SourceKey, SetupMeta> = {
  reddit: {
    title: "Subreddits",
    description: "Subreddits to monitor for discovery matches.",
    fieldLabel: "Subreddit",
    placeholder: "startups",
    emptyHint: "Add at least one subreddit to search.",
  },
  x: {
    title: "Handles",
    description: "X accounts to include in discovery scope.",
    fieldLabel: "Handle",
    placeholder: "@foundername",
    emptyHint: "Add handles to monitor (optional for net-level search).",
  },
  linkedin: {
    title: "Industries",
    description: "Industry filters for LinkedIn discovery.",
    fieldLabel: "Industry",
    placeholder: "software",
    emptyHint: "Add industries to narrow discovery.",
  },
  rss: {
    title: "Feeds",
    description:
      "Public RSS/Atom feed URLs (Substack, blogs, YouTube, podcasts, Reddit .rss). No API key needed.",
    fieldLabel: "Feed URL",
    placeholder: "https://example.substack.com/feed",
    emptyHint: "Add at least one feed URL to ingest.",
  },
};

function getDefaultValues(
  key: SourceKey,
  config: unknown
): RedditConfigValues | XConfigValues | LinkedinConfigValues | RssConfigValues {
  try {
    switch (key) {
      case "reddit":
        return parseSourceConfig("reddit", config);
      case "x":
        return parseSourceConfig("x", config);
      case "linkedin":
        return parseSourceConfig("linkedin", config);
      case "rss":
        return parseSourceConfig("rss", config);
    }
  } catch {
    return defaultSourceConfig(key);
  }
}

type ListFieldName = "subreddits" | "handles" | "industries" | "feeds";

function SetupFormFields<
  TValues extends
    | RedditConfigValues
    | XConfigValues
    | LinkedinConfigValues
    | RssConfigValues,
>({
  form,
  fieldName,
  meta,
  isPending,
  onSubmit,
}: {
  form: UseFormReturn<TValues>;
  fieldName: ListFieldName;
  meta: SetupMeta;
  isPending: boolean;
  onSubmit: (values: TValues) => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldName as never,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-medium">{meta.title}</h2>
          <p className="text-muted-foreground text-sm">{meta.description}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{meta.fieldLabel}s</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append("" as never)}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
              {meta.emptyHint}
            </p>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`${fieldName}.${index}` as never}
                  render={({ field: inputField }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">
                        {meta.fieldLabel} {index + 1}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={meta.placeholder} {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${meta.fieldLabel.toLowerCase()}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Button type="submit" disabled={isPending}>
          Save setup
        </Button>
      </form>
    </Form>
  );
}

function useSourceSetupSubmit(sourceId: string, sourceKey: SourceKey) {
  const [isPending, startTransition] = useTransition();

  function onSubmit(
    values:
      | RedditConfigValues
      | XConfigValues
      | LinkedinConfigValues
      | RssConfigValues
  ) {
    startTransition(async () => {
      try {
        await updateSourceConfig(sourceId, sourceKey, values);
        toast.success("Setup saved");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save setup"
        );
      }
    });
  }

  return { isPending, onSubmit };
}

function RedditSetupForm({
  sourceId,
  defaultValues,
}: {
  sourceId: string;
  defaultValues: RedditConfigValues;
}) {
  const form = useForm<RedditConfigValues>({
    resolver: zodResolver(redditConfigSchema),
    defaultValues,
  });
  const { isPending, onSubmit } = useSourceSetupSubmit(sourceId, "reddit");

  return (
    <SetupFormFields
      form={form}
      fieldName="subreddits"
      meta={setupMeta.reddit}
      isPending={isPending}
      onSubmit={onSubmit}
    />
  );
}

function XSetupForm({
  sourceId,
  defaultValues,
}: {
  sourceId: string;
  defaultValues: XConfigValues;
}) {
  const form = useForm<XConfigValues>({
    resolver: zodResolver(xConfigSchema),
    defaultValues,
  });
  const { isPending, onSubmit } = useSourceSetupSubmit(sourceId, "x");

  return (
    <SetupFormFields
      form={form}
      fieldName="handles"
      meta={setupMeta.x}
      isPending={isPending}
      onSubmit={onSubmit}
    />
  );
}

function LinkedinSetupForm({
  sourceId,
  defaultValues,
}: {
  sourceId: string;
  defaultValues: LinkedinConfigValues;
}) {
  const form = useForm<LinkedinConfigValues>({
    resolver: zodResolver(linkedinConfigSchema),
    defaultValues,
  });
  const { isPending, onSubmit } = useSourceSetupSubmit(sourceId, "linkedin");

  return (
    <SetupFormFields
      form={form}
      fieldName="industries"
      meta={setupMeta.linkedin}
      isPending={isPending}
      onSubmit={onSubmit}
    />
  );
}

function RssSetupForm({
  sourceId,
  defaultValues,
}: {
  sourceId: string;
  defaultValues: RssConfigValues;
}) {
  const form = useForm<RssConfigValues>({
    resolver: zodResolver(rssConfigSchema),
    defaultValues,
  });
  const { isPending, onSubmit } = useSourceSetupSubmit(sourceId, "rss");

  return (
    <SetupFormFields
      form={form}
      fieldName="feeds"
      meta={setupMeta.rss}
      isPending={isPending}
      onSubmit={onSubmit}
    />
  );
}

export function SourceSetupForm({
  sourceId,
  sourceKey,
  config,
}: SourceSetupFormProps) {
  const values = getDefaultValues(sourceKey, config);

  switch (sourceKey) {
    case "reddit":
      return (
        <RedditSetupForm
          sourceId={sourceId}
          defaultValues={values as RedditConfigValues}
        />
      );
    case "x":
      return (
        <XSetupForm sourceId={sourceId} defaultValues={values as XConfigValues} />
      );
    case "linkedin":
      return (
        <LinkedinSetupForm
          sourceId={sourceId}
          defaultValues={values as LinkedinConfigValues}
        />
      );
    case "rss":
      return (
        <RssSetupForm
          sourceId={sourceId}
          defaultValues={values as RssConfigValues}
        />
      );
  }
}
