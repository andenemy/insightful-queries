import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Trash2, Download, Printer, Edit, Upload, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { EditQueryDialog } from "./EditQueryDialog";
import { ImportExcelDialog } from "./ImportExcelDialog";

interface Query {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  query_type_id: string | null;
  created_at: string;
  updated_at: string;
  query_types: { name: string; color: string } | null;
}

export const QueryTable = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingQuery, setEditingQuery] = useState<Query | null>(null);
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

  const filteredQueries = queries
    .filter(q => statusFilter === "all" || q.status === statusFilter)
    .filter(q => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        q.title.toLowerCase().includes(searchLower) ||
        q.description?.toLowerCase().includes(searchLower) ||
        q.query_types?.name.toLowerCase().includes(searchLower)
      );
    });

  const exportToCSV = () => {
    const csvData = filteredQueries.map(q => ({
      Title: q.title,
      Description: q.description || "",
      Type: q.query_types?.name || "",
      Status: q.status,
      Priority: q.priority,
      Created: (()=>{const d=new Date(q.created_at); return isNaN(d.getTime()) ? "" : format(d,"yyyy-MM-dd");})(),
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `queries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Exported to CSV");
  };

  const exportToExcel = () => {
    const excelData = filteredQueries.map(q => ({
      Title: q.title,
      Description: q.description || "",
      Type: q.query_types?.name || "",
      Status: q.status,
      Priority: q.priority,
      Created: (()=>{const d=new Date(q.created_at); return isNaN(d.getTime()) ? "" : format(d,"yyyy-MM-dd");})(),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Queries");
    XLSX.writeFile(wb, `queries-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported to Excel");
  };

  const printSummary = () => {
    // Group queries by date and type
    const summary: { [date: string]: { [type: string]: number } } = {};
    const allTypes = new Set<string>();

    filteredQueries.forEach((q) => {
      const d = new Date(q.created_at); if (isNaN(d.getTime())) return; const date = format(d, "yyyy-MM-dd");
      const type = q.query_types?.name || "Untyped";
      allTypes.add(type);

      if (!summary[date]) summary[date] = {};
      summary[date][type] = (summary[date][type] || 0) + 1;
    });

    // Calculate totals
    const typeColumns = Array.from(allTypes).sort();
    const dates = Object.keys(summary).sort();
    const typeTotals: { [type: string]: number } = {};
    let grandTotal = 0;

    typeColumns.forEach(type => {
      typeTotals[type] = dates.reduce((sum, date) => sum + (summary[date][type] || 0), 0);
      grandTotal += typeTotals[type];
    });

    // Create printable HTML
    let html = `
      <html>
        <head>
          <title>Query Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background-color: #f2f2f2; font-weight: bold; }
            td:first-child, th:first-child { text-align: left; }
            tr:last-child { font-weight: bold; background-color: #f9f9f9; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Query Summary Report</h1>
          <p>Generated: ${format(new Date(), "PPP")}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                ${typeColumns.map(type => `<th>${type}</th>`).join("")}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${dates.map(date => {
                const rowTotal = Object.values(summary[date]).reduce((a, b) => a + b, 0);
                return `
                  <tr>
                    <td>${date}</td>
                    ${typeColumns.map(type => `<td>${summary[date][type] || 0}</td>`).join("")}
                    <td><strong>${rowTotal}</strong></td>
                  </tr>
                `;
              }).join("")}
              <tr>
                <td><strong>Total</strong></td>
                ${typeColumns.map(type => `<td><strong>${typeTotals[type]}</strong></td>`).join("")}
                <td><strong>${grandTotal}</strong></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportSummary = () => {
    // Group queries by date and type
    const summary: { [date: string]: { [type: string]: number } } = {};
    const allTypes = new Set<string>();

    filteredQueries.forEach((q) => {
      const d = new Date(q.created_at); if (isNaN(d.getTime())) return; const date = format(d, "yyyy-MM-dd");
      const type = q.query_types?.name || "Untyped";
      allTypes.add(type);

      if (!summary[date]) summary[date] = {};
      summary[date][type] = (summary[date][type] || 0) + 1;
    });

    const typeColumns = Array.from(allTypes).sort();
    const dates = Object.keys(summary).sort();

    // Calculate totals
    const typeTotals: { [type: string]: number } = {};
    let grandTotal = 0;
    typeColumns.forEach(type => {
      typeTotals[type] = dates.reduce((sum, date) => sum + (summary[date][type] || 0), 0);
      grandTotal += typeTotals[type];
    });

    // Create Excel data
    const excelData = dates.map(date => {
      const row: any = { Date: date };
      typeColumns.forEach(type => {
        row[type] = summary[date][type] || 0;
      });
      row.Total = Object.values(summary[date]).reduce((a, b) => a + b, 0);
      return row;
    });

    // Add totals row
    const totalsRow: any = { Date: "Total" };
    typeColumns.forEach(type => {
      totalsRow[type] = typeTotals[type];
    });
    totalsRow.Total = grandTotal;
    excelData.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `query-summary-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Summary exported to Excel");
  };

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
        <Input
          placeholder="Search queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
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
        <div className="flex gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ImportExcelDialog />
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={printSummary}>
                <Printer className="w-4 h-4 mr-2" />
                Print Summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportSummary}>
                <Download className="w-4 h-4 mr-2" />
                Export Summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No queries found. Add your first query to get started!
                </TableCell>
              </TableRow>
            ) : (
              filteredQueries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={query.query_types?.color ? { borderColor: query.query_types.color, color: query.query_types.color } : undefined}
                    >
                      {query.query_types?.name ?? "Untyped"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(() => { const d = new Date(query.created_at); return isNaN(d.getTime()) ? "-" : format(d, "MMM d, yyyy h:mm a"); })()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(() => { const d = new Date(query.updated_at); return isNaN(d.getTime()) ? "-" : format(d, "MMM d, yyyy h:mm a"); })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingQuery(query)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteQueryMutation.mutate(query.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingQuery && (
        <EditQueryDialog
          query={editingQuery}
          open={!!editingQuery}
          onOpenChange={(open) => !open && setEditingQuery(null)}
        />
      )}
    </div>
  );
};
