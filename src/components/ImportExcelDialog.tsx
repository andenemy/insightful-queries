import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const ImportExcelDialog = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (queries: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: queryTypes } = await supabase
        .from("query_types")
        .select("*");

      const queryTypeMap = new Map(
        queryTypes?.map((qt) => [qt.name.toLowerCase(), qt.id]) || []
      );

      const insertData = queries.map((q) => ({
        user_id: user.id,
        title: q.Title || q.title || "Untitled",
        description: q.Description || q.description || null,
        status: (q.Status || q.status || "pending").toLowerCase(),
        priority: (q.Priority || q.priority || "medium").toLowerCase(),
        query_type_id: queryTypeMap.get((q.Type || q.type || "").toLowerCase()) || null,
      }));

      const { error } = await supabase.from("queries").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queries"] });
      toast.success("Queries imported successfully");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import queries");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      if (json.length === 0) {
        toast.error("No data found in file");
        return;
      }

      importMutation.mutate(json);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Queries from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an Excel file with columns: Title, Description, Type, Status, Priority
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={importMutation.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
