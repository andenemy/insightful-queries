import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Query {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  ai_summary: string | null;
  created_at: string;
  query_types: { name: string; color: string } | null;
}

export const QueryTable = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: queries = [], isLoading } = useQuery({
    queryKey: ["queries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queries")
        .select("*, query_types(name, color)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Query[];
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (query: Query) => {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { title: query.title, description: query.description },
      });

      if (error) throw error;
      if (!data?.summary) throw new Error("No summary generated");

      const { error: updateError } = await supabase
        .from("queries")
        .update({ ai_summary: data.summary })
        .eq("id", query.id);

      if (updateError) throw updateError;
      return data.summary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queries"] });
      toast.success("Summary generated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate summary");
    },
  });

  const deleteQueryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("queries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queries"] });
      toast.success("Query deleted");
    },
    onError: () => {
      toast.error("Failed to delete query");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "resolved" || status === "closed") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("queries").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queries"] });
      toast.success("Status updated");
    },
  });

  const filteredQueries = statusFilter === "all" 
    ? queries 
    : queries.filter(q => q.status === statusFilter);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading queries...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>AI Summary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No queries found. Add your first query to get started!
                </TableCell>
              </TableRow>
            ) : (
              filteredQueries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-medium">{query.title}</TableCell>
                  <TableCell>
                    {query.query_types && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: query.query_types.color,
                          color: query.query_types.color,
                        }}
                      >
                        {query.query_types.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={query.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({ id: query.id, status: value })
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <Badge className={getStatusColor(query.status)}>
                          {query.status.replace("_", " ")}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(query.priority)}>
                      {query.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(query.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {query.ai_summary ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {query.ai_summary}
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateSummaryMutation.mutate(query)}
                        disabled={generateSummaryMutation.isPending}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Generate
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteQueryMutation.mutate(query.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
