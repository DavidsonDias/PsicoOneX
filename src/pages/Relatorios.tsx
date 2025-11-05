import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

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
    { name: 'Ansiedade', value: 35, color: '#9b87f5' },
    { name: 'Depressão', value: 28, color: '#7E69AB' },
    { name: 'Estresse', value: 22, color: '#6E59A5' },
    { name: 'Outros', value: 15, color: '#D6BCFA' }
  ];

  const stats = [
    { title: 'Total de Pacientes', value: '127', icon: Users, trend: '+12%' },
    { title: 'Consultas este Mês', value: '67', icon: Calendar, trend: '+8%' },
    { title: 'Receita Mensal', value: 'R$ 13.400', icon: DollarSign, trend: '+18%' },
    { title: 'Taxa de Presença', value: '95%', icon: TrendingUp, trend: '+2%' }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatórios e Análises</h1>
            <p className="text-muted-foreground">Acompanhe o desempenho do consultório</p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Relatórios
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-green-600">{stat.trend}</span>
              </div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </Card>
          ))}
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="consultas" fill="#9b87f5" name="Consultas Realizadas" />
                  <Bar dataKey="cancelamentos" fill="#ef4444" name="Cancelamentos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Receitas vs Despesas</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value}`} />
                  <Legend />
                  <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} name="Despesas" />
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
                <p className="text-3xl font-bold text-red-600">R$ 23.400</p>
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
                  <Tooltip />
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
      </div>
    </div>
  );
}
