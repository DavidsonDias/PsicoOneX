import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'psychologist' | 'secretary' | 'super_admin';

export const useUserRole = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error loading user roles:', error);
        setLoading(false);
        return;
      }

      setRoles(data.map(r => r.role as UserRole));
      setLoading(false);
    } catch (error) {
      console.error('Error in loadUserRoles:', error);
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isPsychologist = hasRole('psychologist');
  const isSecretary = hasRole('secretary');
  const isSuperAdmin = hasRole('super_admin');

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isPsychologist,
    isSecretary,
    isSuperAdmin,
    refreshRoles: loadUserRoles
  };
};