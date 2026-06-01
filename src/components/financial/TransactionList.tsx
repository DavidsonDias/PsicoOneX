import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { TrendingUp, TrendingDown, Calendar, CreditCard, Banknote, Smartphone, Building } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PaymentLinkActions } from "./PaymentLinkActions";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  payment_status: string;
  due_date: string;
  paid_date: string | null;
  patient_id: string | null;
  patient_name?: string;
  patient_phone?: string | null;
  patient_email?: string | null;
  stripe_payment_link?: string | null;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}
 
 export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
   const getPaymentIcon = (method: string) => {
     const icons: Record<string, React.ReactNode> = {
       credit_card: <CreditCard className="h-4 w-4" />,
       debit_card: <CreditCard className="h-4 w-4" />,
       pix: <Smartphone className="h-4 w-4" />,
       cash: <Banknote className="h-4 w-4" />,
       bank_transfer: <Building className="h-4 w-4" />,
     };
     return icons[method] || <CreditCard className="h-4 w-4" />;
   };
 
   const getStatusConfig = (status: string) => {
     const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
       paid: { variant: "default", label: "Pago" },
       pending: { variant: "secondary", label: "Pendente" },
       overdue: { variant: "destructive", label: "Atrasado" },
       cancelled: { variant: "outline", label: "Cancelado" },
     };
     return configs[status] || configs.pending;
   };
 
   return (
     <div className="space-y-2">
       <AnimatePresence mode="popLayout">
         {transactions.map((transaction, index) => {
           const statusConfig = getStatusConfig(transaction.payment_status);
 
           return (
             <motion.div
               key={transaction.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ delay: index * 0.02 }}
               className={cn(
                 "flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md",
                 transaction.type === "income"
                   ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                   : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
               )}
             >
               <div className="flex items-center gap-4">
                 <div
                   className={cn(
                     "h-12 w-12 rounded-xl flex items-center justify-center",
                     transaction.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                   )}
                 >
                   {transaction.type === "income" ? (
                     <TrendingUp className="h-6 w-6 text-green-500" />
                   ) : (
                     <TrendingDown className="h-6 w-6 text-red-500" />
                   )}
                 </div>
                 <div>
                   <p className="font-medium">{transaction.description}</p>
                   <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     {transaction.patient_name && (
                       <span>{transaction.patient_name}</span>
                     )}
                     <span className="flex items-center gap-1">
                       <Calendar className="h-3 w-3" />
                       {format(new Date(transaction.due_date), "dd/MM/yyyy")}
                     </span>
                     <span className="flex items-center gap-1">
                       {getPaymentIcon(transaction.payment_method)}
                       {transaction.category}
                     </span>
                   </div>
                 </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="text-right">
                   <p
                     className={cn(
                       "text-lg font-bold",
                       transaction.type === "income" ? "text-green-500" : "text-red-500"
                     )}
                   >
                     {transaction.type === "income" ? "+" : "-"} R${" "}
                     {Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                   </p>
                   <Badge variant={statusConfig.variant} className="text-xs">
                     {statusConfig.label}
                   </Badge>
                 </div>
                 <ActionMenu
                   onEdit={() => onEdit(transaction)}
                   onDelete={() => onDelete(transaction.id)}
                   deleteTitle="Excluir Transação"
                   deleteDescription="Deseja excluir esta transação?"
                 />
               </div>
             </motion.div>
           );
         })}
       </AnimatePresence>
     </div>
   );
 }