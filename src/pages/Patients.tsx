import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Phone, Mail, Calendar, Users, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  status: string;
  cpf: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

// Máscaras de formatação
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // States para campos com máscara
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // States para edição
  const [editPhone, setEditPhone] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (editingPatient) {
      setEditPhone(editingPatient.phone || "");
      setEditCpf(editingPatient.cpf || "");
      setEditEmergencyPhone(editingPatient.emergency_phone || "");
    }
  }, [editingPatient]);

  const resetCreateForm = () => {
    setPhone("");
    setCpf("");
    setEmergencyPhone("");
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

      const email = formData.get("email") as string;
      const birthDate = formData.get("birth_date") as string;
      const notes = formData.get("notes") as string;
      const address = formData.get("address") as string;
      const emergencyContact = formData.get("emergency_contact") as string;

      const { error } = await supabase.from("patients").insert({
        psychologist_id: session.user.id,
        full_name: formData.get("full_name") as string,
        email: email || null,
        phone: phone || null,
        birth_date: birthDate || null,
        notes: notes || null,
        cpf: cpf || null,
        address: address || null,
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
      });

      if (error) throw error;

      toast.success("Paciente cadastrado com sucesso!");
      setDialogOpen(false);
      loadPatients();
      (e.target as HTMLFormElement).reset();
      resetCreateForm();
    } catch (error: any) {
      toast.error("Erro ao cadastrar paciente");
    }
  };

  const handleEditPatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPatient) return;
    
    const formData = new FormData(e.currentTarget);

    try {
      const email = formData.get("email") as string;
      const birthDate = formData.get("birth_date") as string;
      const notes = formData.get("notes") as string;
      const address = formData.get("address") as string;
      const emergencyContact = formData.get("emergency_contact") as string;

      const { error } = await supabase
        .from("patients")
        .update({
          full_name: formData.get("full_name") as string,
          email: email || null,
          phone: editPhone || null,
          birth_date: birthDate || null,
          notes: notes || null,
          cpf: editCpf || null,
          address: address || null,
          emergency_contact: emergencyContact || null,
          emergency_phone: editEmergencyPhone || null,
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
    <AppLayout title="Gerenciar Pacientes" description="Cadastro e consulta de pacientes">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetCreateForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
              <DialogDescription>
                Preencha os dados do paciente para criar o cadastro
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
              <form onSubmit={handleCreatePatient} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Dados Pessoais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input id="full_name" name="full_name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input 
                        id="cpf" 
                        name="cpf" 
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input id="birth_date" name="birth_date" type="date" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input id="address" name="address" placeholder="Rua, número, bairro, cidade - UF" />
                    </div>
                  </div>
                </div>

                {/* Contato de Emergência */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Contato de Emergência</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact">Nome do Contato</Label>
                      <Input id="emergency_contact" name="emergency_contact" placeholder="Nome do responsável" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_phone">Telefone de Emergência</Label>
                      <Input 
                        id="emergency_phone" 
                        name="emergency_phone" 
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" rows={3} placeholder="Observações sobre o paciente..." />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Cadastrar Paciente
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-primary mx-auto animate-pulse mb-4" />
          <p className="text-muted-foreground">Carregando pacientes...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Paciente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition-all group">
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
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.birth_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{new Date(patient.birth_date).toLocaleDateString("pt-BR")}</span>
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">{patient.address}</span>
                      </div>
                    )}
                    {patient.emergency_contact && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{patient.emergency_contact}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                        {patient.status === "active" ? "Ativo" : patient.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Atualize os dados do paciente
            </DialogDescription>
          </DialogHeader>
          {editingPatient && (
            <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
              <form onSubmit={handleEditPatient} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Dados Pessoais</h3>
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
                      <Label htmlFor="edit_cpf">CPF</Label>
                      <Input 
                        id="edit_cpf" 
                        name="cpf" 
                        value={editCpf}
                        onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
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
                      <Label htmlFor="edit_phone">Telefone *</Label>
                      <Input 
                        id="edit_phone" 
                        name="phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        required
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit_address">Endereço</Label>
                      <Input 
                        id="edit_address" 
                        name="address" 
                        defaultValue={editingPatient.address || ""}
                        placeholder="Rua, número, bairro, cidade - UF" 
                      />
                    </div>
                  </div>
                </div>

                {/* Contato de Emergência */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Contato de Emergência</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_emergency_contact">Nome do Contato</Label>
                      <Input 
                        id="edit_emergency_contact" 
                        name="emergency_contact" 
                        defaultValue={editingPatient.emergency_contact || ""}
                        placeholder="Nome do responsável" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_emergency_phone">Telefone de Emergência</Label>
                      <Input 
                        id="edit_emergency_phone" 
                        name="emergency_phone" 
                        value={editEmergencyPhone}
                        onChange={(e) => setEditEmergencyPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Observações</Label>
                  <Textarea 
                    id="edit_notes" 
                    name="notes" 
                    rows={3}
                    defaultValue={editingPatient.notes || ""}
                    placeholder="Observações sobre o paciente..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditingPatient(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
