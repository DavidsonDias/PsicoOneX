 import * as React from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { cn } from "@/lib/utils";
 import { Input } from "./input";
 import { Button } from "./button";
 import { Badge } from "./badge";
 import { Search, Filter, Download, ChevronLeft, ChevronRight, SortAsc, SortDesc } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
 
 interface Column<T> {
   key: keyof T | string;
   header: string;
   render?: (item: T) => React.ReactNode;
   sortable?: boolean;
   className?: string;
 }
 
 interface DataTableProps<T> {
   data: T[];
   columns: Column<T>[];
   searchPlaceholder?: string;
   searchKey?: keyof T;
   onRowClick?: (item: T) => void;
   actions?: (item: T) => React.ReactNode;
   emptyState?: React.ReactNode;
   filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
   onExport?: () => void;
   pageSize?: number;
 }
 
 export function DataTable<T extends { id: string }>({
   data,
   columns,
   searchPlaceholder = "Buscar...",
   searchKey,
   onRowClick,
   actions,
   emptyState,
   filters = [],
   onExport,
   pageSize = 10,
 }: DataTableProps<T>) {
   const [searchTerm, setSearchTerm] = React.useState("");
   const [currentPage, setCurrentPage] = React.useState(1);
   const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" } | null>(null);
   const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({});
 
   const filteredData = React.useMemo(() => {
     let result = [...data];
 
     if (searchTerm && searchKey) {
       result = result.filter((item) =>
         String(item[searchKey]).toLowerCase().includes(searchTerm.toLowerCase())
       );
     }
 
     Object.entries(activeFilters).forEach(([key, value]) => {
       if (value && value !== "all") {
         result = result.filter((item) => String((item as any)[key]) === value);
       }
     });
 
     if (sortConfig) {
       result.sort((a, b) => {
         const aVal = (a as any)[sortConfig.key];
         const bVal = (b as any)[sortConfig.key];
         if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
         if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
         return 0;
       });
     }
 
     return result;
   }, [data, searchTerm, searchKey, sortConfig, activeFilters]);
 
   const totalPages = Math.ceil(filteredData.length / pageSize);
   const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
 
   const handleSort = (key: string) => {
     setSortConfig((prev) =>
       prev?.key === key
         ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
         : { key, direction: "asc" }
     );
   };
 
   return (
     <div className="space-y-4">
       <div className="flex flex-col sm:flex-row gap-4 justify-between">
         <div className="flex flex-wrap gap-3 items-center">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder={searchPlaceholder}
               value={searchTerm}
               onChange={(e) => {
                 setSearchTerm(e.target.value);
                 setCurrentPage(1);
               }}
               className="pl-10 w-[250px]"
             />
           </div>
           {filters.map((filter) => (
             <Select
               key={filter.key}
               value={activeFilters[filter.key] || "all"}
               onValueChange={(value) => {
                 setActiveFilters((prev) => ({ ...prev, [filter.key]: value }));
                 setCurrentPage(1);
               }}
             >
               <SelectTrigger className="w-[150px]">
                 <Filter className="h-4 w-4 mr-2" />
                 <SelectValue placeholder={filter.label} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos</SelectItem>
                 {filter.options.map((opt) => (
                   <SelectItem key={opt.value} value={opt.value}>
                     {opt.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           ))}
         </div>
         {onExport && (
           <Button variant="outline" onClick={onExport} className="gap-2">
             <Download className="h-4 w-4" />
             Exportar
           </Button>
         )}
       </div>
 
       <div className="rounded-lg border border-border overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="bg-muted/50">
               <tr>
                 {columns.map((col) => (
                   <th
                     key={String(col.key)}
                     className={cn(
                       "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                       col.sortable && "cursor-pointer hover:text-foreground transition-colors",
                       col.className
                     )}
                     onClick={() => col.sortable && handleSort(String(col.key))}
                   >
                     <div className="flex items-center gap-2">
                       {col.header}
                       {col.sortable && sortConfig?.key === col.key && (
                         sortConfig.direction === "asc" ? (
                           <SortAsc className="h-4 w-4" />
                         ) : (
                           <SortDesc className="h-4 w-4" />
                         )
                       )}
                     </div>
                   </th>
                 ))}
                 {actions && <th className="px-4 py-3 w-[50px]" />}
               </tr>
             </thead>
             <tbody>
               <AnimatePresence mode="popLayout">
                 {paginatedData.length === 0 ? (
                   <tr>
                     <td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                       {emptyState || "Nenhum resultado encontrado"}
                     </td>
                   </tr>
                 ) : (
                   paginatedData.map((item, index) => (
                     <motion.tr
                       key={item.id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0 }}
                       transition={{ delay: index * 0.02 }}
                       className={cn(
                         "border-t border-border hover:bg-muted/30 transition-colors",
                         onRowClick && "cursor-pointer"
                       )}
                       onClick={() => onRowClick?.(item)}
                     >
                       {columns.map((col) => (
                         <td key={String(col.key)} className={cn("px-4 py-3 text-sm", col.className)}>
                           {col.render ? col.render(item) : String((item as any)[col.key] ?? "-")}
                         </td>
                       ))}
                       {actions && (
                         <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                           {actions(item)}
                         </td>
                       )}
                     </motion.tr>
                   ))
                 )}
               </AnimatePresence>
             </tbody>
           </table>
         </div>
       </div>
 
       {totalPages > 1 && (
         <div className="flex items-center justify-between">
           <p className="text-sm text-muted-foreground">
             Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredData.length)} de{" "}
             {filteredData.length} resultados
           </p>
           <div className="flex items-center gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
               disabled={currentPage === 1}
             >
               <ChevronLeft className="h-4 w-4" />
             </Button>
             <span className="text-sm px-3">
               {currentPage} / {totalPages}
             </span>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages}
             >
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
         </div>
       )}
     </div>
   );
 }