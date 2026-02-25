import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'trial' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'blocked' | 'suspended' | 'cancelled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  trial_start_date: string;
  trial_end_date: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        setLoading(false);
        return;
      }

      setSubscription(data as Subscription | null);
    } catch (error) {
      console.error('Error in loadSubscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';
  const isTrial = subscription?.status === 'trial';
  const isExpired = subscription?.status === 'expired';
  const isBlocked = subscription?.status === 'blocked' || subscription?.status === 'suspended' || subscription?.status === 'cancelled';
  
  // Calculate trial days remaining
  const trialDaysRemaining = (() => {
    if (!subscription?.trial_end_date || subscription.status !== 'trial') return 0;
    const now = new Date();
    const end = new Date(subscription.trial_end_date);
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    // Count business days remaining
    let businessDays = 0;
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) businessDays++;
      current.setDate(current.getDate() + 1);
    }
    return Math.max(0, businessDays);
  })();

  const isTrialExpiring = isTrial && trialDaysRemaining <= 2;

  // Can the user create/edit/delete? (read-only mode if not active)
  const canWrite = isActive;

  const planLabel: Record<PlanType, string> = {
    trial: 'Trial',
    basic: 'Básico',
    pro: 'Profissional',
    enterprise: 'Enterprise',
  };

  return {
    subscription,
    loading,
    isActive,
    isTrial,
    isExpired,
    isBlocked,
    trialDaysRemaining,
    isTrialExpiring,
    canWrite,
    planLabel: subscription ? planLabel[subscription.plan] : 'Trial',
    refresh: loadSubscription,
  };
};
