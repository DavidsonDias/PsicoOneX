import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Plus, Search, ArrowLeft, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionMenu } from "@/components/ui/action-menu";

interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  status: string;
}

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  useEffect(() => {
    checkAuthAndLoadPatients();
  }, []);

  const checkAuthAndLoadPatients = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadPatients();
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("patients").insert({
        psychologist_id: session.user.id,
        full_name: formData.get("full_name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        birth_date: formData.get("birth_date") as string,
        notes: formData.get("notes") as string,
      });

      if (error) throw error;

      toast.success("Paciente cadastrado com sucesso!");
      setDialogOpen(false);
      loadPatients();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error("Erro ao cadastrar paciente");
    }
  };

  const handleEditPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: formData.get("full_name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          birth_date: formData.get("birth_date") as string,
          notes: formData.get("notes") as string,
        })
        .eq("id", editingPatient.id);

      if (error) throw error;

      toast.success("Paciente atualizado com sucesso!");
      setEditingPatient(null);
      loadPatients();
    } catch (error: any) {
      toast.error("Erro ao atualizar paciente");
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      toast.success("Paciente excluído com sucesso!");
      loadPatients();
    } catch (error: any) {
      toast.error("Erro ao excluir paciente");
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Gerenciar Pacientes</h1>
                  <p className="text-sm text-muted-foreground">Cadastro e consulta de pacientes</p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do paciente para criar o cadastro
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input id="full_name" name="full_name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" name="phone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input id="birth_date" name="birth_date" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" name="notes" rows={3} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="hero">
                      Cadastrar Paciente
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Patients Grid */}
        {loading ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-primary mx-auto animate-pulse mb-4" />
            <p className="text-muted-foreground">Carregando pacientes...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
              </p>
              {!searchTerm && (
                <Button variant="hero" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Paciente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:border-primary/50 transition-all">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-lg">{patient.full_name}</CardTitle>
                  <ActionMenu
                    onEdit={() => setEditingPatient(patient)}
                    onDelete={() => handleDeletePatient(patient.id)}
                    deleteTitle="Excluir Paciente"
                    deleteDescription={`Tem certeza que deseja excluir ${patient.full_name}? Todos os registros associados serão removidos.`}
                  />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {patient.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.birth_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(patient.birth_date).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  <div className="pt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                      {patient.status === "active" ? "Ativo" : patient.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Atualize os dados do paciente
            </DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <form onSubmit={handleEditPatient} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_full_name">Nome Completo *</Label>
                  <Input 
                    id="edit_full_name" 
                    name="full_name" 
                    defaultValue={editingPatient.full_name}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_email">E-mail</Label>
                  <Input 
                    id="edit_email" 
                    name="email" 
                    type="email"
                    defaultValue={editingPatient.email || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Telefone</Label>
                  <Input 
                    id="edit_phone" 
                    name="phone"
                    defaultValue={editingPatient.phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_birth_date">Data de Nascimento</Label>
                  <Input 
                    id="edit_birth_date" 
                    name="birth_date" 
                    type="date"
                    defaultValue={editingPatient.birth_date || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Observações</Label>
                <Textarea 
                  id="edit_notes" 
                  name="notes" 
                  rows={3}
                  defaultValue={editingPatient.notes || ""}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingPatient(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="hero">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
