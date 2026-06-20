"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createSource } from "@/lib/actions/sources";
import {
  createSourceSchema,
  type CreateSourceValues,
  type SourceKey,
} from "@/lib/validators";
import { platformLabels } from "@/lib/validators/source-config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SourceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePlatforms: SourceKey[];
};

export function SourceFormDialog({
  open,
  onOpenChange,
  availablePlatforms,
}: SourceFormDialogProps) {
  const defaultKey = availablePlatforms[0];

  const form = useForm<CreateSourceValues>({
    resolver: zodResolver(createSourceSchema),
    defaultValues: {
      key: defaultKey,
      label: defaultKey ? platformLabels[defaultKey] : "",
    },
  });

  const selectedKey = form.watch("key");

  useEffect(() => {
    if (selectedKey && platformLabels[selectedKey]) {
      form.setValue("label", platformLabels[selectedKey]);
    }
  }, [selectedKey, form]);

  useEffect(() => {
    if (open && defaultKey) {
      form.reset({
        key: defaultKey,
        label: platformLabels[defaultKey],
      });
    }
  }, [open, defaultKey, form]);

  async function onSubmit(values: CreateSourceValues) {
    try {
      await createSource(values);
      toast.success("Source created");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create source"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Connect a discovery platform. You can configure it on the setup page
            after creating.
          </DialogDescription>
        </DialogHeader>

        {availablePlatforms.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            All available platforms have already been added.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePlatforms.map((key) => (
                          <SelectItem key={key} value={key}>
                            {platformLabels[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display label</FormLabel>
                    <FormControl>
                      <Input placeholder="Reddit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add source</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
