"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createNet, updateNet } from "@/lib/actions/nets";
import {
  netFormSchema,
  paramsObjectToArray,
  type IcpTarget,
  type NetFormValues,
} from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SourceOption = {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
};

type NetForEdit = {
  id: string;
  name: string;
  description: string | null;
  params: unknown;
  isActive: boolean;
  icpTarget: string;
  sources: { sourceId: string }[];
};

type NetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: SourceOption[];
  net?: NetForEdit;
};

export function NetFormDialog({
  open,
  onOpenChange,
  sources,
  net,
}: NetFormDialogProps) {
  const isEditing = Boolean(net);

  const form = useForm<NetFormValues>({
    resolver: zodResolver(netFormSchema),
    defaultValues: net
      ? {
          name: net.name,
          description: net.description ?? "",
          isActive: net.isActive,
          icpTarget: (net.icpTarget as IcpTarget) ?? "either",
          params: paramsObjectToArray(net.params as Record<string, unknown>),
          sourceIds: net.sources.map((s) => s.sourceId),
        }
      : {
          name: "",
          description: "",
          isActive: true,
          icpTarget: "either",
          params: [{ key: "keywords", value: "" }],
          sourceIds: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "params",
  });

  async function onSubmit(values: NetFormValues) {
    try {
      if (isEditing && net) {
        await updateNet(net.id, values);
        toast.success("Net updated");
      } else {
        await createNet(values);
        toast.success("Net created");
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save net");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit net" : "Create net"}</DialogTitle>
          <DialogDescription>
            Define search parameters and link enabled sources.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Early-stage founders" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icpTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ICP target</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as IcpTarget)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ICP target" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="persuader">
                        High-Stakes Persuaders
                      </SelectItem>
                      <SelectItem value="evaluator">
                        High-Signal Evaluators
                      </SelectItem>
                      <SelectItem value="either">Either</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Inactive nets are kept but not run.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Search params</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ key: "", value: "" })}
                >
                  <Plus className="size-4" />
                  Add param
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`params.${index}.key`}
                    render={({ field: keyField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="key" {...keyField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`params.${index}.value`}
                    render={({ field: valueField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="value" {...valueField} />
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
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="sourceIds"
              render={() => (
                <FormItem>
                  <FormLabel>Linked sources</FormLabel>
                  <div className="space-y-2 rounded-lg border p-3">
                    {sources.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No sources available. Seed the database first.
                      </p>
                    ) : (
                      sources.map((source) => (
                        <FormField
                          key={source.id}
                          control={form.control}
                          name="sourceIds"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(source.id)}
                                  onCheckedChange={(checked) => {
                                    const next = checked
                                      ? [...field.value, source.id]
                                      : field.value.filter((id) => id !== source.id);
                                    field.onChange(next);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {source.label}
                                {!source.enabled && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    (disabled)
                                  </span>
                                )}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Save changes" : "Create net"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
