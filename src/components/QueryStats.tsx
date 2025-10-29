import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "./StatsCard";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const QueryStats = () => {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data: queries, error } = await supabase
        .from("queries")
        .select("status, priority");
      
      if (error) throw error;

      const total = queries.length;
      const resolved = queries.filter(q => q.status === "resolved" || q.status === "closed").length;
      const pending = queries.filter(q => q.status === "pending").length;
      const urgent = queries.filter(q => q.priority === "urgent").length;

      return { total, resolved, pending, urgent };
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Queries"
        value={stats?.total || 0}
        icon={FileText}
      />
      <StatsCard
        title="Resolved"
        value={stats?.resolved || 0}
        icon={CheckCircle2}
        className="border-accent/20"
      />
      <StatsCard
        title="Pending"
        value={stats?.pending || 0}
        icon={Clock}
        className="border-secondary/20"
      />
      <StatsCard
        title="Urgent"
        value={stats?.urgent || 0}
        icon={AlertCircle}
        className="border-destructive/20"
      />
    </div>
  );
};
