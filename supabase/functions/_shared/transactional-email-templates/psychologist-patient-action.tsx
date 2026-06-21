/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PsicoOne'

interface Props {
  psychologistName?: string
  patientName?: string
  actionType?: 'cancel' | 'reschedule' | 'message' | 'confirm' | 'access_sent' | 'appointment_created' | 'diagnostic'
  appointmentDate?: string
  appointmentTime?: string
  reason?: string
  message?: string
  proposedDate?: string
  agendaUrl?: string
}

const ACTION_META: Record<string, { emoji: string; title: string; preview: string; cta: string }> = {
  cancel: {
    emoji: '❌',
    title: 'Sessão cancelada pelo paciente',
    preview: 'Um paciente cancelou uma sessão agendada',
    cta: 'Ver na Agenda',
  },
  reschedule: {
    emoji: '🔄',
    title: 'Solicitação de reagendamento',
    preview: 'Um paciente solicitou reagendar uma sessão',
    cta: 'Aprovar / Recusar',
  },
  message: {
    emoji: '💬',
    title: 'Nova mensagem do paciente',
    preview: 'Você recebeu uma mensagem de um paciente',
    cta: 'Responder no sistema',
  },
  confirm: {
    emoji: '✅',
    title: 'Presença confirmada',
    preview: 'Um paciente confirmou presença na sessão',
    cta: 'Abrir Agenda',
  },
  access_sent: {
    emoji: '🔗',
    title: 'Acesso de teleatendimento enviado',
    preview: 'O link seguro de acesso do paciente foi gerado e enviado',
    cta: 'Abrir Agenda',
  },
  appointment_created: {
    emoji: '📅',
    title: 'Novo agendamento criado',
    preview: 'Um novo agendamento foi criado e o paciente recebeu o acesso',
    cta: 'Abrir Agenda',
  },
  diagnostic: {
    emoji: '🧪',
    title: 'Teste completo de notificações',
    preview: 'Diagnóstico enterprise de e-mail, push e notificação interna',
    cta: 'Abrir Diagnóstico',
  },
}

const PsychologistPatientActionEmail = ({
  psychologistName,
  patientName,
  actionType = 'message',
  appointmentDate,
  appointmentTime,
  reason,
  message,
  proposedDate,
  agendaUrl,
}: Props) => {
  const meta = ACTION_META[actionType] || ACTION_META.message
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{meta.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={logoWrap}>
            <div style={logoIcon}>P</div>
            <Heading style={logoText}>{SITE_NAME}</Heading>
          </div>

          <Heading style={h1}>
            {meta.emoji} {meta.title}
          </Heading>

          <Text style={greeting}>
            Olá{psychologistName ? `, ${psychologistName.split(' ')[0]}` : ''}!
          </Text>

          <Section style={infoBox}>
            <Text style={infoLine}>
              <strong>Paciente:</strong> {patientName || '—'}
            </Text>
            {appointmentDate && (
              <Text style={infoLine}>
                <strong>Sessão original:</strong> {appointmentDate} às {appointmentTime}
              </Text>
            )}
            {proposedDate && (
              <Text style={infoLine}>
                <strong>Nova data sugerida:</strong> {proposedDate}
              </Text>
            )}
            {reason && (
              <Text style={infoLine}>
                <strong>Motivo:</strong> {reason}
              </Text>
            )}
            {message && (
              <Text style={infoLine}>
                <strong>Mensagem:</strong> "{message}"
              </Text>
            )}
          </Section>

          {agendaUrl && (
            <Section style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button href={agendaUrl} style={button}>
                {meta.cta}
              </Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Você está recebendo este e-mail porque é o profissional vinculado a este paciente no {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: PsychologistPatientActionEmail,
  subject: (data) => {
    const meta = ACTION_META[data.actionType as string] || ACTION_META.message
    return `${meta.emoji} ${meta.title}${data.patientName ? ` — ${data.patientName}` : ''}`
  },
  displayName: 'Notificação ao Psicólogo (ação do paciente)',
  previewData: {
    psychologistName: 'Dra. Marina',
    patientName: 'João Silva',
    actionType: 'cancel',
    appointmentDate: 'segunda-feira, 22 de abril de 2026',
    appointmentTime: '14:00',
    reason: 'Imprevisto pessoal',
    agendaUrl: 'https://psicoone.app/agenda',
  },
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', padding: '40px 0' }
const container = { backgroundColor: '#ffffff', maxWidth: '560px', margin: '0 auto', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }
const logoWrap = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }
const logoIcon = { width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }
const logoText = { margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }
const h1 = { fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }
const greeting = { fontSize: '14px', color: '#475569', marginBottom: '12px' }
const infoBox = { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }
const infoLine = { margin: '4px 0', fontSize: '14px', color: '#334155', lineHeight: '1.5' }
const button = { backgroundColor: '#3b82f6', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, lineHeight: '1.5' }
