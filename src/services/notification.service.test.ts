import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
const fromMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
    from: (...a: unknown[]) => fromMock(...a),
    auth: { getSession: () => getSessionMock() },
  },
}));

vi.mock("@/lib/patient-access", () => ({
  createPatientAccessLink: vi.fn(async () => "tok_TEST123"),
  getPortalUrl: (t: string) => `https://app.test/portal/${t}`,
}));

import {
  sendAppointmentNotification,
  resendAppointmentAccess,
} from "./notification.service";

// ---- Test fixtures ----
const ctx = {
  appointmentId: "apt-1",
  patientId: "pat-1",
  scheduledAt: "2030-01-15T17:00:00.000Z",
  durationMinutes: 50,
  type: "online",
  psychologistId: "psy-1",
};

function makeFromImpl(opts: {
  patientEmail?: string | null;
  notificationEmails?: string[];
  prefs?: Record<string, unknown> | null;
}) {
  const { patientEmail = "patient@test.com", notificationEmails = [], prefs = null } = opts;
  return (table: string) => {
    if (table === "patients") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { full_name: "João Silva", email: patientEmail }, error: null }),
          }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                full_name: "Dra Ana",
                clinic_name: "Clínica X",
                notification_emails: notificationEmails,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "user_preferences") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: prefs ? { settings: prefs } : null, error: null }),
          }),
        }),
      };
    }
    if (table === "appointments") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: ctx.appointmentId,
                patient_id: ctx.patientId,
                psychologist_id: ctx.psychologistId,
                scheduled_at: ctx.scheduledAt,
                duration_minutes: ctx.durationMinutes,
                type: ctx.type,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "audit_logs") {
      return { insert: async () => ({ error: null }) };
    }
    return { select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) };
  };
}

beforeEach(() => {
  invokeMock.mockReset();
  fromMock.mockReset();
  getSessionMock.mockReset();
  invokeMock.mockResolvedValue({ data: { success: true, queued: true }, error: null });
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: ctx.psychologistId, email: "psy@test.com" } } } });
});

describe("sendAppointmentNotification", () => {
  it("envia email ao paciente e retorna portalUrl", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const r = await sendAppointmentNotification(ctx);
    expect(r.success).toBe(true);
    expect(r.emailSent).toBe(true);
    expect(r.portalUrl).toContain("/portal/tok_TEST123");
    const calls = invokeMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain("send-transactional-email");
  });

  it("respeita skipEmail: gera token e não chama email", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const r = await sendAppointmentNotification(ctx, { skipEmail: true });
    expect(r.success).toBe(true);
    expect(r.emailSent).toBe(false);
    expect(r.portalUrl).toContain("/portal/");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("sem email no paciente retorna portalUrl com reason=no_email", async () => {
    fromMock.mockImplementation(makeFromImpl({ patientEmail: null }));
    const r = await sendAppointmentNotification(ctx);
    expect(r.emailSent).toBe(false);
    expect(r.reason).toBe("no_email");
    expect(r.portalUrl).toContain("/portal/");
  });

  it("envia cópia ao psicólogo quando bcc_self está ativo", async () => {
    fromMock.mockImplementation(
      makeFromImpl({
        notificationEmails: ["clinica@test.com"],
        prefs: { psychologist_alerts: { bcc_self_on_patient_emails: true } },
      })
    );
    const r = await sendAppointmentNotification(ctx);
    expect(r.psychologistEmailSent).toBe(true);
    const templates = invokeMock.mock.calls.map((c: any) => c[1]?.body?.templateName);
    expect(templates).toContain("psychologist-patient-action");
  });
});

describe("resendAppointmentAccess", () => {
  it("dispara fluxo e registra audit + notificação interna", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const r = await resendAppointmentAccess(ctx.appointmentId);
    expect(r.success).toBe(true);
    const fnNames = invokeMock.mock.calls.map((c) => c[0]);
    expect(fnNames).toContain("send-transactional-email");
    expect(fnNames).toContain("dispatch-notification");
  });

  it("quando on_access_share=false, gera link mas não envia email", async () => {
    fromMock.mockImplementation(
      makeFromImpl({ prefs: { email_events: { on_access_share: false } } })
    );
    const r = await resendAppointmentAccess(ctx.appointmentId);
    expect(r.emailSent).toBe(false);
    expect(r.portalUrl).toContain("/portal/");
    const fnNames = invokeMock.mock.calls.map((c) => c[0]);
    expect(fnNames).not.toContain("send-transactional-email");
    expect(fnNames).toContain("dispatch-notification");
  });
});
