import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";

export default function Relatorios() {
  const appointmentData = [
    { month: 'Jan', consultas: 45, cancelamentos: 3 },
    { month: 'Fev', consultas: 52, cancelamentos: 5 },
    { month: 'Mar', consultas: 48, cancelamentos: 2 },
    { month: 'Abr', consultas: 61, cancelamentos: 4 },
    { month: 'Mai', consultas: 55, cancelamentos: 6 },
    { month: 'Jun', consultas: 67, cancelamentos: 3 }
  ];

  const revenueData = [
    { month: 'Jan', receita: 9000, despesas: 3500 },
    { month: 'Fev', receita: 10400, despesas: 3800 },
    { month: 'Mar', receita: 9600, despesas: 3500 },
    { month: 'Abr', receita: 12200, despesas: 4200 },
    { month: 'Mai', receita: 11000, despesas: 3900 },
    { month: 'Jun', receita: 13400, despesas: 4500 }
  ];

  const patientDistribution = [
    { name: 'Ansiedade', value: 35, color: 'hsl(var(--primary))' },
    { name: 'Depressão', value: 28, color: 'hsl(var(--primary) / 0.8)' },
    { name: 'Estresse', value: 22, color: 'hsl(var(--primary) / 0.6)' },
    { name: 'Outros', value: 15, color: 'hsl(var(--primary) / 0.4)' }
  ];

  return (
    <AppLayout title="Relatórios e Análises" description="Acompanhe o desempenho do consultório">
      <div className="flex justify-end mb-6">
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatórios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Pacientes"
          value="127"
          icon={Users}
          trend={{ value: 12, label: "+12% este mês" }}
          variant="blue"
        />
        <StatCard
          title="Consultas este Mês"
          value="67"
          icon={Calendar}
          trend={{ value: 8, label: "+8% este mês" }}
          variant="purple"
        />
        <StatCard
          title="Receita Mensal"
          value="R$ 13.400"
          icon={DollarSign}
          trend={{ value: 18, label: "+18% este mês" }}
          variant="green"
        />
        <StatCard
          title="Taxa de Presença"
          value="95%"
          icon={TrendingUp}
          trend={{ value: 2, label: "+2% este mês" }}
          variant="amber"
        />
      </div>

      <Tabs defaultValue="appointments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appointments">Consultas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Consultas por Mês</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="consultas" fill="hsl(var(--primary))" name="Consultas Realizadas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelamentos" fill="hsl(var(--destructive))" name="Cancelamentos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Receitas vs Despesas</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  formatter={(value) => `R$ ${value}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="hsl(142, 76%, 36%)" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" strokeWidth={2} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Receita Total (6 meses)</p>
              <p className="text-3xl font-bold text-green-600">R$ 65.600</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Despesas Totais (6 meses)</p>
              <p className="text-3xl font-bold text-destructive">R$ 23.400</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Lucro Líquido (6 meses)</p>
              <p className="text-3xl font-bold text-primary">R$ 42.200</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Distribuição por Diagnóstico</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={patientDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {patientDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Novos Pacientes</h3>
              <p className="text-4xl font-bold mb-2">15</p>
              <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Taxa de Retenção</h3>
              <p className="text-4xl font-bold mb-2">87%</p>
              <p className="text-sm text-muted-foreground">Pacientes ativos</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
