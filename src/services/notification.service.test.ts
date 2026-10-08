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
  getAppointmentEmailStatus,
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
  invokeMock.mockResolvedValue({ data: { sent: false, queued: true, messageId: "synthetic-message" }, error: null });
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: ctx.psychologistId, email: "psy@test.com" } } } });
});

describe("sendAppointmentNotification", () => {
  it("reconhece envio anterior sem criar nova confirmação de fila", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    invokeMock.mockResolvedValue({data:{sent:true,queued:false,already_sent:true,messageId:"existing"},error:null});
    const r = await sendAppointmentNotification(ctx);
    expect(r).toMatchObject({success:true,emailSent:true,emailQueued:false,reason:"already_sent"});
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
  it("solicita confirmação no servidor e distingue fila de envio", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const r = await sendAppointmentNotification(ctx);
    expect(r.success).toBe(true);
    expect(r.emailSent).toBe(false);
    expect(r.emailQueued).toBe(true);
    expect(r.portalUrl).toContain("/portal/tok_TEST123");
    const calls = invokeMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["send-appointment-email"]);
    expect(invokeMock.mock.calls[0][1]).toEqual({ body: {
      appointmentId: ctx.appointmentId, patientId: ctx.patientId, token: "tok_TEST123",
    } });
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

  it("não chama o produtor interno nem afirma envio de cópias no staging", async () => {
    fromMock.mockImplementation(
      makeFromImpl({
        notificationEmails: ["clinica@test.com"],
        prefs: { psychologist_alerts: { bcc_self_on_patient_emails: true } },
      })
    );
    const r = await sendAppointmentNotification(ctx);
    expect(r.psychologistEmailSent).toBe(false);
    expect(invokeMock.mock.calls.map(c => c[0])).toEqual(["send-appointment-email"]);
  });

  it.each([
    null, {}, { success: true }, { queued: true },
    { queued: true, sent: false, messageId: "" },
    { queued: true, sent: true, messageId: "ambiguous" },
    { success: false, reason: "email_suppressed" },
  ])("recusa confirmação incompleta ou contraditória: %j", async data => {
    fromMock.mockImplementation(makeFromImpl({}));
    invokeMock.mockResolvedValue({ data, error: null });
    const result = await sendAppointmentNotification(ctx);
    expect(result.success).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.emailQueued).not.toBe(true);
    expect(result.portalUrl).toContain("/portal/");
  });

  it("mantém o link quando o servidor recusa o envio", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    invokeMock.mockResolvedValue({ data: null, error: { message: "private upstream details" } });
    const result = await sendAppointmentNotification(ctx);
    expect(result.success).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.portalUrl).toContain("/portal/");
    expect(result.error).not.toContain("private");
  });

  it("não troca um lembrete por confirmação nem contorna a pausa", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const result = await sendAppointmentNotification(ctx, { templateName: "appointment-reminder" });
    expect(result.reason).toBe("reminders_unavailable");
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("resendAppointmentAccess", () => {
  it("dispara fluxo e registra audit + notificação interna", async () => {
    fromMock.mockImplementation(makeFromImpl({}));
    const r = await resendAppointmentAccess(ctx.appointmentId);
    expect(r.success).toBe(true);
    const fnNames = invokeMock.mock.calls.map((c) => c[0]);
    expect(fnNames).toContain("send-appointment-email");
    expect(fnNames).toContain("dispatch-notification");
    expect(fnNames).not.toContain("send-transactional-email");
    const notice = invokeMock.mock.calls.find(c => c[0] === "dispatch-notification");
    expect(notice?.[1].body.title).toBe("E-mail aguardando envio");
  });

  it("quando on_access_share=false, gera link mas não envia email", async () => {
    fromMock.mockImplementation(
      makeFromImpl({ prefs: { email_events: { on_access_share: false } } })
    );
    const r = await resendAppointmentAccess(ctx.appointmentId);
    expect(r.emailSent).toBe(false);
    expect(r.portalUrl).toContain("/portal/");
    const fnNames = invokeMock.mock.calls.map((c) => c[0]);
    expect(fnNames).not.toContain("send-appointment-email");
    expect(fnNames).toContain("dispatch-notification");
  });
});

describe("getAppointmentEmailStatus", () => {
  it("considera somente o histórico da consulta solicitada", async () => {
    const eq = vi.fn().mockReturnThis();
    const query = { select: vi.fn().mockReturnThis(), eq, order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { status: "sent" } }) };
    fromMock.mockReturnValue(query);
    expect(await getAppointmentEmailStatus(ctx.appointmentId)).toBe("sent");
    expect(eq).toHaveBeenCalledWith("metadata->>appointment_id", ctx.appointmentId);
  });
});
