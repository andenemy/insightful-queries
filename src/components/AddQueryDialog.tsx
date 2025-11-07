import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const AddQueryDialog = () => {
  const [open, setOpen] = useState(false);
  const [queryTypeId, setQueryTypeId] = useState("");
  const queryClient = useQueryClient();

  const { data: queryTypes = [] } = useQuery({
    queryKey: ["query-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("query_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addQueryMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("queries").insert({
        user_id: user.id,
        title: "Query",
        description: "",
        query_type_id: queryTypeId || null,
        priority: "medium",
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Query added successfully");
      setQueryTypeId("");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to add query");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addQueryMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Query
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Query</DialogTitle>
          <DialogDescription>
            Create a new query to track. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Query Type *</Label>
            <Select value={queryTypeId} onValueChange={setQueryTypeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {queryTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addQueryMutation.isPending || !queryTypeId}>
              {addQueryMutation.isPending ? "Adding..." : "Add Query"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
