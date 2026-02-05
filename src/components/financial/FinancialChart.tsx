 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
 import { useState } from "react";
 import { TrendingUp, TrendingDown } from "lucide-react";
 
 interface FinancialChartProps {
   data: { month: string; receita: number; despesa: number }[];
 }
 
 export function FinancialChart({ data }: FinancialChartProps) {
   const [chartType, setChartType] = useState<"area" | "bar">("area");
 
   const totalIncome = data.reduce((acc, d) => acc + d.receita, 0);
   const totalExpense = data.reduce((acc, d) => acc + d.despesa, 0);
   const profit = totalIncome - totalExpense;
 
   return (
     <Card>
       <CardHeader className="pb-4">
         <div className="flex items-center justify-between">
           <CardTitle className="text-lg">Fluxo Financeiro</CardTitle>
           <Tabs value={chartType} onValueChange={(v) => setChartType(v as "area" | "bar")}>
             <TabsList className="h-8">
               <TabsTrigger value="area" className="text-xs px-3">Área</TabsTrigger>
               <TabsTrigger value="bar" className="text-xs px-3">Barras</TabsTrigger>
             </TabsList>
           </Tabs>
         </div>
         <div className="flex gap-6 mt-4">
           <div className="flex items-center gap-2">
             <div className="h-3 w-3 rounded-full bg-green-500" />
             <span className="text-sm text-muted-foreground">Receitas</span>
             <span className="text-sm font-semibold text-green-600">
               R$ {totalIncome.toLocaleString("pt-BR")}
             </span>
           </div>
           <div className="flex items-center gap-2">
             <div className="h-3 w-3 rounded-full bg-red-500" />
             <span className="text-sm text-muted-foreground">Despesas</span>
             <span className="text-sm font-semibold text-red-600">
               R$ {totalExpense.toLocaleString("pt-BR")}
             </span>
           </div>
           <div className="flex items-center gap-2 ml-auto">
             {profit >= 0 ? (
               <TrendingUp className="h-4 w-4 text-green-500" />
             ) : (
               <TrendingDown className="h-4 w-4 text-red-500" />
             )}
             <span className="text-sm font-semibold">
               Lucro: R$ {profit.toLocaleString("pt-BR")}
             </span>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <div className="h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             {chartType === "area" ? (
               <AreaChart data={data}>
                 <defs>
                   <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                     <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                   </linearGradient>
                   <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                     <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                 <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <Tooltip
                   contentStyle={{
                     backgroundColor: "hsl(var(--card))",
                     border: "1px solid hsl(var(--border))",
                     borderRadius: "8px",
                   }}
                   formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                 />
                 <Area
                   type="monotone"
                   dataKey="receita"
                   stroke="#22c55e"
                   fillOpacity={1}
                   fill="url(#colorReceita)"
                   name="Receita"
                 />
                 <Area
                   type="monotone"
                   dataKey="despesa"
                   stroke="#ef4444"
                   fillOpacity={1}
                   fill="url(#colorDespesa)"
                   name="Despesa"
                 />
               </AreaChart>
             ) : (
               <BarChart data={data}>
                 <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                 <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                 <Tooltip
                   contentStyle={{
                     backgroundColor: "hsl(var(--card))",
                     border: "1px solid hsl(var(--border))",
                     borderRadius: "8px",
                   }}
                   formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                 />
                 <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receita" />
                 <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesa" />
               </BarChart>
             )}
           </ResponsiveContainer>
         </div>
       </CardContent>
     </Card>
   );
 }