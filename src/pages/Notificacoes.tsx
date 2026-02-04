import { useState } from "react";
import { motion } from "framer-motion";
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

interface Notification {
  id: string;
  type: "appointment" | "payment" | "patient" | "system" | "alert";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "appointment",
    title: "Consulta confirmada",
    message: "João Silva confirmou a consulta de amanhã às 14:00",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: "2",
    type: "payment",
    title: "Pagamento recebido",
    message: "R$ 250,00 de Maria Santos foi confirmado",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: "3",
    type: "alert",
    title: "Lembrete importante",
    message: "Você tem 3 prontuários pendentes de atualização",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "Atualização do sistema",
    message: "Nova funcionalidade de IA disponível para prontuários",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
  {
    id: "5",
    type: "patient",
    title: "Novo paciente cadastrado",
    message: "Carlos Oliveira foi adicionado à sua lista de pacientes",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
  },
];

const typeIcons = {
  appointment: Calendar,
  payment: DollarSign,
  patient: User,
  system: Sparkles,
  alert: AlertTriangle,
};

const typeColors = {
  appointment: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  payment: "bg-green-500/10 text-green-500 border-green-500/20",
  patient: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  system: "bg-primary/10 text-primary border-primary/20",
  alert: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function Notificacoes() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    paymentAlerts: true,
    systemUpdates: true,
    soundEnabled: true,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

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
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <X className="h-4 w-4 mr-2" />
                Limpar tudo
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <ScrollArea className="h-[600px]">
              <CardContent className="p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-16">
                    <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Nenhuma notificação</h3>
                    <p className="text-muted-foreground">
                      Você está em dia! Não há notificações pendentes.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification, index) => {
                    const IconComponent = typeIcons[notification.type];
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          notification.read
                            ? "bg-background border-border"
                            : "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className={cn(
                            "p-2.5 rounded-xl border shrink-0",
                            typeColors[notification.type]
                          )}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  {notification.title}
                                  {!notification.read && (
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(notification.timestamp, {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(notification.id)}
                                >
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
                    <p className="text-muted-foreground">
                      Você não tem notificações não lidas.
                    </p>
                  </div>
                ) : (
                  notifications.filter(n => !n.read).map((notification, index) => {
                    const IconComponent = typeIcons[notification.type];
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                      >
                        <div className="flex gap-4">
                          <div className={cn(
                            "p-2.5 rounded-xl border shrink-0",
                            typeColors[notification.type]
                          )}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(notification.timestamp, {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
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
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Canais de Notificação
                </CardTitle>
                <CardDescription>
                  Escolha como deseja receber suas notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Receba alertas no seu email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, emailNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-xs text-muted-foreground">
                      Alertas no navegador
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, pushNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS</Label>
                    <p className="text-xs text-muted-foreground">
                      Mensagens de texto
                    </p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, smsNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {settings.soundEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                      Som de Notificação
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Tocar som ao receber alertas
                    </p>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, soundEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tipos de Alerta
                </CardTitle>
                <CardDescription>
                  Personalize quais alertas deseja receber
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", typeColors.appointment)}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <Label>Lembretes de Consulta</Label>
                      <p className="text-xs text-muted-foreground">
                        Alertas de agendamentos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.appointmentReminders}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, appointmentReminders: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", typeColors.payment)}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <Label>Alertas Financeiros</Label>
                      <p className="text-xs text-muted-foreground">
                        Pagamentos e cobranças
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.paymentAlerts}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, paymentAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", typeColors.system)}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <Label>Atualizações do Sistema</Label>
                      <p className="text-xs text-muted-foreground">
                        Novos recursos e melhorias
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.systemUpdates}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, systemUpdates: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
