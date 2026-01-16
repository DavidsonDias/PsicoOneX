import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, UserCog } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin) {
        toast.error("Acesso negado. Apenas administradores.");
        navigate("/dashboard");
        return;
      }
      loadUsers();
    }
  }, [isAdmin, roleLoading, navigate]);

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        toast.error("Erro ao carregar usuários");
        return;
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error loading roles:", rolesError);
        toast.error("Erro ao carregar perfis");
        return;
      }

      let authUsers: any[] = [];
      try {
        const { data } = await supabase.auth.admin.listUsers();
        authUsers = data?.users || [];
      } catch (authError) {
        console.error("Error loading auth users:", authError);
      }

      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const authUser = authUsers.find((u: any) => u.id === profile.id);
        const roles = userRoles?.filter(r => r.user_id === profile.id).map(r => r.role as string) || [];
        
        return {
          id: profile.id,
          email: authUser?.email || "Email não disponível",
          full_name: profile.full_name,
          roles
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error in loadUsers:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, role: 'admin' | 'psychologist' | 'secretary') => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role }]);

      if (error) {
        console.error("Error adding role:", error);
        toast.error("Erro ao adicionar perfil");
        return;
      }

      toast.success("Perfil adicionado com sucesso");
      await loadUsers();
    } catch (error) {
      console.error("Error in addRole:", error);
      toast.error("Erro ao adicionar perfil");
    }
  };

  const removeRole = async (userId: string, role: 'admin' | 'psychologist' | 'secretary') => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) {
        console.error("Error removing role:", error);
        toast.error("Erro ao remover perfil");
        return;
      }

      toast.success("Perfil removido com sucesso");
      await loadUsers();
    } catch (error) {
      console.error("Error in removeRole:", error);
      toast.error("Erro ao remover perfil");
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-destructive text-destructive-foreground";
      case "psychologist":
        return "bg-primary text-primary-foreground";
      case "secretary":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "psychologist":
        return "Psicólogo";
      case "secretary":
        return "Secretária";
      default:
        return role;
    }
  };

  return (
    <AppLayout title="Administração de Usuários" description="Gerencie perfis e permissões">
      <div className="grid gap-6">
        {users.map(user => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    {user.full_name}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map(role => (
                    <Badge
                      key={role}
                      className={`${getRoleBadgeColor(role)} cursor-pointer`}
                      onClick={() => removeRole(user.id, role as 'admin' | 'psychologist' | 'secretary')}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Select onValueChange={(role) => addRole(user.id, role as 'admin' | 'psychologist' | 'secretary')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Adicionar perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {!user.roles.includes("admin") && (
                      <SelectItem value="admin">Administrador</SelectItem>
                    )}
                    {!user.roles.includes("psychologist") && (
                      <SelectItem value="psychologist">Psicólogo</SelectItem>
                    )}
                    {!user.roles.includes("secretary") && (
                      <SelectItem value="secretary">Secretária</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card className="text-center py-12">
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminUsers;
