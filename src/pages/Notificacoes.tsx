import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell, Settings, Check, X, Volume2, VolumeX,
  Calendar, DollarSign, User, AlertTriangle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PushCategoryPrefs = Record<string, boolean>;

const PUSH_CATEGORIES: { id: string; label: string; desc: string }[] = [
  { id: "agenda", label: "Agenda", desc: "Novos agendamentos, remarcações, cancelamentos" },
  { id: "financeiro", label: "Financeiro", desc: "Pagamentos recebidos, vencidos e novos lançamentos" },
  { id: "prontuario", label: "Prontuários", desc: "Criação e atualização de prontuários" },
  { id: "paciente", label: "Pacientes", desc: "Onboarding concluído, atualização de cadastro" },
  { id: "sistema", label: "Sistema", desc: "Avisos da plataforma" },
];

const typeIcons: Record<string, React.ElementType> = {
  appointment: Calendar,
  payment: DollarSign,
  patient: User,
  system: Sparkles,
  alert: AlertTriangle,
};

const typeColors: Record<string, string> = {
  appointment: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  payment: "bg-green-500/10 text-green-500 border-green-500/20",
  patient: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  system: "bg-primary/10 text-primary border-primary/20",
  alert: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function Notificacoes() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, markAsRead, markAllAsRead,
    deleteNotification, clearAll, createNotification,
  } = useNotifications();
  const push = usePushSubscription();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const visible = categoryFilter === "all"
    ? notifications
    : notifications.filter((n: any) => (n.category || n.type) === categoryFilter);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    paymentAlerts: true,
    systemUpdates: true,
    soundEnabled: true,
  });

  // Per-category push preferences (persisted in user_preferences.settings)
  const [pushCategoryPrefs, setPushCategoryPrefs] = useState<PushCategoryPrefs>(
    Object.fromEntries(PUSH_CATEGORIES.map((c) => [c.id, true])),
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("settings")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const stored = (data?.settings as any)?.push_categories;
      if (stored && typeof stored === "object") {
        setPushCategoryPrefs((prev) => ({ ...prev, ...stored }));
      }
    })();
  }, []);

  const togglePushCategory = async (id: string, value: boolean) => {
    const next = { ...pushCategoryPrefs, [id]: value };
    setPushCategoryPrefs(next);
    setSavingPrefs(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingPrefs(false); return; }
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("settings")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const merged = { ...((existing?.settings as any) ?? {}), push_categories: next };
    await supabase
      .from("user_preferences")
      .upsert({ user_id: session.user.id, settings: merged }, { onConflict: "user_id" });
    setSavingPrefs(false);
  };

  // Seed a welcome notification if empty on first load
  useEffect(() => {
    if (notifications.length === 0) {
      createNotification({
        type: "system",
        title: "Bem-vindo ao PsicoOne Enterprise",
        message: "Seu sistema de notificações em tempo real está ativo. Você receberá alertas de agendamentos, pagamentos e atualizações aqui.",
        action_path: "/dashboard",
        action_label: "Ir ao Dashboard",
      });
    }
  }, []);

  return (
    <AppLayout title="Notificações" description="Gerencie suas notificações e preferências">
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Bell className="h-4 w-4" />
              Todas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">Não lidas</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Preferências
            </TabsTrigger>
          </TabsList>

          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <X className="h-4 w-4 mr-2" />
                Limpar tudo
              </Button>
            </div>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "Todas" },
            { id: "agenda", label: "Agenda" },
            { id: "appointment", label: "Consultas" },
            { id: "payment", label: "Financeiro" },
            { id: "patient", label: "Pacientes" },
            { id: "patient_onboarding", label: "Onboarding" },
            { id: "system", label: "Sistema" },
            { id: "alert", label: "Alertas" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition",
                categoryFilter === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <ScrollArea className="h-[600px]">
              <CardContent className="p-4 space-y-3">
                {visible.length === 0 ? (
                  <div className="text-center py-16">
                    <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Nenhuma notificação</h3>
                    <p className="text-muted-foreground">Você está em dia!</p>
                  </div>
                ) : (
                  visible.map((notification, index) => {
                    const IconComponent = typeIcons[notification.type] || Bell;
                    const colorClass = typeColors[notification.type] || typeColors.system;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "p-4 rounded-xl border transition-all cursor-pointer",
                          notification.read ? "bg-background border-border" : "bg-primary/5 border-primary/20"
                        )}
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id);
                          if (notification.action_path) navigate(notification.action_path);
                        }}
                      >
                        <div className="flex gap-4">
                          <div className={cn("p-2.5 rounded-xl border shrink-0", colorClass)}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  {notification.title}
                                  {!notification.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="mt-0">
          <Card>
            <ScrollArea className="h-[600px]">
              <CardContent className="p-4 space-y-3">
                {notifications.filter(n => !n.read).length === 0 ? (
                  <div className="text-center py-16">
                    <Check className="h-16 w-16 text-green-500/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Tudo em dia!</h3>
                    <p className="text-muted-foreground">Você não tem notificações não lidas.</p>
                  </div>
                ) : (
                  notifications.filter(n => !n.read).map((notification, index) => {
                    const IconComponent = typeIcons[notification.type] || Bell;
                    const colorClass = typeColors[notification.type] || typeColors.system;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer"
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.action_path) navigate(notification.action_path);
                        }}
                      >
                        <div className="flex gap-4">
                          <div className={cn("p-2.5 rounded-xl border shrink-0", colorClass)}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Canais de Notificação</CardTitle>
                <CardDescription>Escolha como deseja receber suas notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "emailNotifications", label: "Email", desc: "Receba alertas no seu email" },
                  { key: "pushNotifications", label: "Push", desc: "Alertas no navegador" },
                  { key: "smsNotifications", label: "SMS", desc: "Mensagens de texto" },
                  { key: "soundEnabled", label: "Som", desc: "Tocar som ao receber alertas", icon: true },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {item.icon && (settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />)}
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={item.key === "pushNotifications" ? push.subscribed : (settings as any)[item.key]}
                      disabled={item.key === "pushNotifications" && (!push.supported || push.loading)}
                      onCheckedChange={(checked) => {
                        if (item.key === "pushNotifications") {
                          checked ? push.subscribe() : push.unsubscribe();
                          return;
                        }
                        setSettings({ ...settings, [item.key]: checked });
                      }}
                    />
                  </div>
                ))}
                {!push.supported && (
                  <p className="text-[11px] text-muted-foreground">
                    Push disponível apenas no app instalado (PWA) com chave VAPID configurada.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Push por categoria</CardTitle>
                <CardDescription>
                  Escolha quais categorias acionam push no seu dispositivo. Aplicado em tempo real para todos os eventos disparados pelo sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {PUSH_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{cat.label}</Label>
                      <p className="text-xs text-muted-foreground">{cat.desc}</p>
                    </div>
                    <Switch
                      checked={pushCategoryPrefs[cat.id] !== false}
                      disabled={savingPrefs || !push.subscribed}
                      onCheckedChange={(v) => togglePushCategory(cat.id, v)}
                    />
                  </div>
                ))}
                {!push.subscribed && (
                  <p className="text-[11px] text-muted-foreground">
                    Ative o Push na coluna ao lado para personalizar por categoria.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
