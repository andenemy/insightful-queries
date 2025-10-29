import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { QueryStats } from "@/components/QueryStats";
import { QueryTable } from "@/components/QueryTable";
import { AddQueryDialog } from "@/components/AddQueryDialog";
import { QueryTypeManager } from "@/components/QueryTypeManager";
import { Button } from "@/components/ui/button";
import { BarChart3, LogOut } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">QueryTrack</h1>
                <p className="text-sm text-muted-foreground">Smart query management</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <QueryStats />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Queries</h2>
            <p className="text-muted-foreground">
              Track and manage all your queries in one place
            </p>
          </div>
          <div className="flex gap-2">
            <QueryTypeManager />
            <AddQueryDialog />
          </div>
        </div>

        <QueryTable />
      </main>
    </div>
  );
};

export default Index;
