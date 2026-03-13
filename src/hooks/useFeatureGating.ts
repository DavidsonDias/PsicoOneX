import { useSubscription } from './useSubscription';
import { useWriteGuard } from '@/components/subscription/WriteBlockedModal';

export interface FeatureGating {
  canWrite: boolean;
  canUseAI: boolean;
  canUseGoogleCalendar: boolean;
  canExportData: boolean;
  canUseTelehealth: boolean;
  patientLimit: number | null; // null = unlimited
  isWithinPatientLimit: (currentCount: number) => boolean;
  guardAction: (action: () => void) => void;
}

export const useFeatureGating = (): FeatureGating => {
  const { subscription, canWrite } = useSubscription();
  const { guardWrite } = useWriteGuard();

  const plan = subscription?.plan || 'trial';
  const isActive = canWrite;

  // Feature matrix by plan
  const features: Record<string, { ai: boolean; googleCal: boolean; export: boolean; telehealth: boolean; patientLimit: number | null }> = {
    trial: { ai: true, googleCal: true, export: true, telehealth: true, patientLimit: null },
    basic: { ai: false, googleCal: false, export: false, telehealth: false, patientLimit: 30 },
    pro: { ai: true, googleCal: true, export: true, telehealth: true, patientLimit: null },
    enterprise: { ai: true, googleCal: true, export: true, telehealth: true, patientLimit: null },
  };

  const planFeatures = features[plan] || features.trial;

  return {
    canWrite: isActive,
    canUseAI: isActive && planFeatures.ai,
    canUseGoogleCalendar: isActive && planFeatures.googleCal,
    canExportData: isActive && planFeatures.export,
    canUseTelehealth: isActive && planFeatures.telehealth,
    patientLimit: planFeatures.patientLimit,
    isWithinPatientLimit: (currentCount: number) => {
      if (!planFeatures.patientLimit) return true;
      return currentCount < planFeatures.patientLimit;
    },
    guardAction: (action: () => void) => {
      guardWrite(action);
    },
  };
};
