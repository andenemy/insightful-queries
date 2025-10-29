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
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const QueryTypeManager = () => {
  const [open, setOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#3B82F6");
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

  const addTypeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("query_types").insert({
        user_id: user.id,
        name: newTypeName,
        color: newTypeColor,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["query-types"] });
      toast.success("Query type added");
      setNewTypeName("");
      setNewTypeColor("#3B82F6");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add query type");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("query_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["query-types"] });
      toast.success("Query type deleted");
    },
    onError: () => {
      toast.error("Failed to delete query type");
    },
  });

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    addTypeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Manage Types
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Manage Query Types</DialogTitle>
          <DialogDescription>
            Create and manage custom query types for better organization.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleAddType} className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <div className="space-y-2">
              <Label htmlFor="typeName">Type Name</Label>
              <Input
                id="typeName"
                placeholder="e.g. Bug Report"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeColor">Color</Label>
              <Input
                id="typeColor"
                type="color"
                value={newTypeColor}
                onChange={(e) => setNewTypeColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={addTypeMutation.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-2">
          <Label>Existing Types</Label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {queryTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No query types yet. Add one above!
              </p>
            ) : (
              queryTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: type.color,
                      color: type.color,
                    }}
                  >
                    {type.name}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTypeMutation.mutate(type.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
