 import { motion } from "framer-motion";
 import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface QuickStatsProps {
   stats: {
     total: number;
     confirmed: number;
     completed: number;
     cancelled: number;
     pending: number;
   };
 }
 
 export function QuickStats({ stats }: QuickStatsProps) {
   const items = [
     { label: "Total", value: stats.total, icon: Calendar, color: "text-primary" },
     { label: "Confirmados", value: stats.confirmed, icon: CheckCircle, color: "text-green-500" },
     { label: "Realizados", value: stats.completed, icon: TrendingUp, color: "text-purple-500" },
     { label: "Cancelados", value: stats.cancelled, icon: XCircle, color: "text-destructive" },
     { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-amber-500" },
   ];
 
   return (
     <div className="grid grid-cols-5 gap-2">
       {items.map((item, index) => (
         <motion.div
           key={item.label}
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: index * 0.05 }}
           className="text-center p-3 rounded-lg bg-muted/50"
         >
           <item.icon className={cn("h-5 w-5 mx-auto mb-1", item.color)} />
           <p className="text-xl font-bold">{item.value}</p>
           <p className="text-xs text-muted-foreground">{item.label}</p>
         </motion.div>
       ))}
     </div>
   );
 }