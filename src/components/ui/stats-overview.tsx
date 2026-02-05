 import * as React from "react";
 import { motion } from "framer-motion";
 import { cn } from "@/lib/utils";
 import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
 
 interface StatItem {
   label: string;
   value: string | number;
   change?: number;
   icon?: LucideIcon;
   color?: "blue" | "green" | "red" | "amber" | "purple";
 }
 
 interface StatsOverviewProps {
   stats: StatItem[];
   className?: string;
 }
 
 export function StatsOverview({ stats, className }: StatsOverviewProps) {
   const colorClasses = {
     blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
     green: "from-green-500/20 to-green-500/5 border-green-500/30",
     red: "from-red-500/20 to-red-500/5 border-red-500/30",
     amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
     purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
   };
 
   const iconColors = {
     blue: "text-blue-500",
     green: "text-green-500",
     red: "text-red-500",
     amber: "text-amber-500",
     purple: "text-purple-500",
   };
 
   return (
     <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
       {stats.map((stat, index) => {
         const Icon = stat.icon;
         const color = stat.color || "blue";
 
         return (
           <motion.div
             key={stat.label}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: index * 0.1 }}
             className={cn(
               "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4",
               colorClasses[color]
             )}
           >
             <div className="flex items-start justify-between">
               <div className="space-y-1">
                 <p className="text-sm text-muted-foreground">{stat.label}</p>
                 <p className="text-2xl font-bold">{stat.value}</p>
               </div>
               {Icon && (
                 <div className={cn("p-2 rounded-lg bg-background/50", iconColors[color])}>
                   <Icon className="h-5 w-5" />
                 </div>
               )}
             </div>
             {stat.change !== undefined && (
               <div className="flex items-center gap-1 mt-2 text-sm">
                 {stat.change > 0 ? (
                   <>
                     <TrendingUp className="h-4 w-4 text-green-500" />
                     <span className="text-green-500">+{stat.change}%</span>
                   </>
                 ) : stat.change < 0 ? (
                   <>
                     <TrendingDown className="h-4 w-4 text-red-500" />
                     <span className="text-red-500">{stat.change}%</span>
                   </>
                 ) : (
                   <>
                     <Minus className="h-4 w-4 text-muted-foreground" />
                     <span className="text-muted-foreground">0%</span>
                   </>
                 )}
                 <span className="text-muted-foreground ml-1">vs mês anterior</span>
               </div>
             )}
           </motion.div>
         );
       })}
     </div>
   );
 }