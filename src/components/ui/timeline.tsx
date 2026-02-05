 import * as React from "react";
 import { motion } from "framer-motion";
 import { cn } from "@/lib/utils";
 
 interface TimelineItem {
   id: string;
   title: string;
   description?: string;
   date: string;
   icon?: React.ReactNode;
   status?: "completed" | "pending" | "active" | "cancelled";
   meta?: React.ReactNode;
 }
 
 interface TimelineProps {
   items: TimelineItem[];
   onItemClick?: (item: TimelineItem) => void;
   className?: string;
 }
 
 export function Timeline({ items, onItemClick, className }: TimelineProps) {
   const statusColors = {
     completed: "bg-green-500",
     pending: "bg-yellow-500",
     active: "bg-primary",
     cancelled: "bg-destructive",
   };
 
   return (
     <div className={cn("relative space-y-0", className)}>
       <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border" />
       {items.map((item, index) => (
         <motion.div
           key={item.id}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: index * 0.05 }}
           className={cn(
             "relative flex gap-4 pl-10 py-4 group",
             onItemClick && "cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
           )}
           onClick={() => onItemClick?.(item)}
         >
           <div
             className={cn(
               "absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background z-10 flex items-center justify-center",
               item.status ? statusColors[item.status] : "bg-primary"
             )}
           >
             {item.icon && <span className="text-white scale-75">{item.icon}</span>}
           </div>
           <div className="flex-1 min-w-0">
             <div className="flex items-start justify-between gap-4">
               <div className="min-w-0">
                 <p className="font-medium truncate">{item.title}</p>
                 {item.description && (
                   <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                 )}
               </div>
               <div className="flex flex-col items-end gap-1 shrink-0">
                 <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
                 {item.meta}
               </div>
             </div>
           </div>
         </motion.div>
       ))}
     </div>
   );
 }