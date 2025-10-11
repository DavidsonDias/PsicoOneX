import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Users, Calendar, FileText, DollarSign, LogOut, User } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    records: 0,
    revenue: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Load stats
      const [patientsRes, appointmentsRes, recordsRes, transactionsRes] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("medical_records").select("*", { count: "exact", head: true }),
        supabase.from("financial_transactions")
          .select("amount")
          .eq("type", "income")
          .eq("status", "paid"),
      ]);

      const revenue = transactionsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      setStats({
        patients: patientsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        records: recordsRes.count || 0,
        revenue,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">PsicoOne</h1>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span className="font-medium">{profile?.full_name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de gestão profissional
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Pacientes"
            value={stats.patients}
            description="Total de pacientes cadastrados"
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            icon={Calendar}
            title="Agendamentos"
            value={stats.appointments}
            description="Total de sessões agendadas"
            color="bg-purple-500/10 text-purple-500"
          />
          <StatCard
            icon={FileText}
            title="Prontuários"
            value={stats.records}
            description="Registros clínicos criados"
            color="bg-indigo-500/10 text-indigo-500"
          />
          <StatCard
            icon={DollarSign}
            title="Receita"
            value={`R$ ${stats.revenue.toFixed(2)}`}
            description="Total recebido"
            color="bg-green-500/10 text-green-500"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse as principais funcionalidades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate("/pacientes")}
            >
              <Users className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Gerenciar Pacientes</div>
                <div className="text-xs text-muted-foreground">Cadastre e edite pacientes</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate("/agenda")}
            >
              <Calendar className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Agenda</div>
                <div className="text-xs text-muted-foreground">Visualize e agende sessões</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate("/prontuarios")}
            >
              <FileText className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Prontuários</div>
                <div className="text-xs text-muted-foreground">Registros clínicos</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate("/financeiro")}
            >
              <DollarSign className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Financeiro</div>
                <div className="text-xs text-muted-foreground">Controle de pagamentos</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  description: string;
  color: string;
}

function StatCard({ icon: Icon, title, value, description, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
