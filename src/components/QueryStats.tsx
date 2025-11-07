import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "./StatsCard";
import { FileText } from "lucide-react";

export const QueryStats = () => {
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

  const { data: queries = [] } = useQuery({
    queryKey: ["queries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queries")
        .select("query_type_id");
      if (error) throw error;
      return data;
    },
  });

  const typeCounts = queryTypes.map(type => ({
    name: type.name,
    count: queries.filter(q => q.query_type_id === type.id).length,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {typeCounts.map((type) => (
        <StatsCard
          key={type.name}
          title={type.name}
          value={type.count}
          icon={FileText}
        />
      ))}
    </div>
  );
};
