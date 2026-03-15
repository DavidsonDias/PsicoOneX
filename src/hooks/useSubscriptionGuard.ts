import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWriteGuard } from '@/components/subscription/WriteBlockedModal';

/**
 * Server-side subscription check that runs before ANY write operation.
 * This is the final line of defense — it queries the DB directly
 * to verify the subscription is still valid, preventing race conditions
 * and stale state issues.
 */
export const useSubscriptionGuard = () => {
  const { guardWrite, showBlockedModal } = useWriteGuard();

  const checkSubscriptionBeforeWrite = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_end_date, plan_expires_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!sub) {
        showBlockedModal();
        return false;
      }

      const now = Date.now();

      // Check if trial has expired by date
      const isTrialExpiredByDate = sub.status === 'trial' 
        && sub.trial_end_date 
        && new Date(sub.trial_end_date).getTime() < now;

      // Check if paid plan has expired by date
      const isPlanExpiredByDate = sub.status === 'active' 
        && sub.plan_expires_at 
        && new Date(sub.plan_expires_at).getTime() < now;

      // Check if status itself is expired/blocked
      const isStatusBlocked = ['expired', 'blocked', 'suspended', 'cancelled'].includes(sub.status);

      if (isTrialExpiredByDate || isPlanExpiredByDate || isStatusBlocked) {
        showBlockedModal();
        return false;
      }

      return true;
    } catch (err) {
      console.error('Subscription guard check failed:', err);
      showBlockedModal();
      return false;
    }
  }, [showBlockedModal]);

  return { checkSubscriptionBeforeWrite, guardWrite, showBlockedModal };
};
