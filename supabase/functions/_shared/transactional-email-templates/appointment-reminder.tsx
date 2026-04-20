/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PsicoOne'

interface AppointmentReminderProps {
  patientName?: string
  date?: string
  time?: string
  duration?: string
  type?: string
  psychologistName?: string
  clinicName?: string
  portalUrl?: string
  hoursAhead?: string
}

const AppointmentReminderEmail = ({
  patientName,
  date,
  time,
  duration,
  type,
  psychologistName,
  clinicName,
  portalUrl,
  hoursAhead,
}: AppointmentReminderProps) => {
  const isImminent = hoursAhead === '1'
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {isImminent
          ? `Sua sessão começa em 1 hora — ${time || ''}`
          : `Lembrete: sua sessão é amanhã às ${time || ''}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={logoWrap}>
            <div style={logoIcon}>P</div>
            <Heading style={logoText}>{SITE_NAME}</Heading>
          </div>

          <Text style={greeting}>
            Olá{patientName ? `, ${patientName}` : ''}!
          </Text>
          <Text style={text}>
            {isImminent
              ? '⏰ Sua sessão começa em 1 hora. Prepare-se!'
              : '📅 Lembrete amigável: sua sessão é amanhã.'}
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>📅 Data</Text>
            <Text style={detailValue}>{date || '—'}</Text>
            <Text style={detailLabel}>⏰ Horário</Text>
            <Text style={detailValue}>{time || '—'} · {duration || '50'} minutos</Text>
            <Text style={detailLabel}>📍 Modalidade</Text>
            <Text style={detailValue}>{type === 'online' ? 'Online (Videochamada)' : 'Presencial'}</Text>
            {psychologistName && (
              <Text style={detailMuted}>
                👩‍⚕️ {psychologistName}{clinicName ? ` · ${clinicName}` : ''}
              </Text>
            )}
          </Section>

          {portalUrl && (
            <Section style={ctaWrap}>
              <Button style={ctaButton} href={portalUrl}>
                {type === 'online' ? 'Entrar na sessão' : 'Acessar portal'}
              </Button>
            </Section>
          )}

          <Text style={footnote}>
            {isImminent
              ? 'Recomendamos testar sua câmera e microfone antes do horário.'
              : 'Caso precise reagendar, entre em contato com seu profissional.'}
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            🔒 {SITE_NAME} · Plataforma Clínica Inteligente{'\n'}
            Este é um e-mail automático, não responda.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AppointmentReminderEmail,
  subject: (data: Record<string, any>) =>
    data.hoursAhead === '1'
      ? `⏰ Sua sessão começa em 1 hora`
      : `📅 Lembrete: sessão amanhã às ${data.time || ''}`,
  displayName: 'Lembrete de sessão (24h / 1h)',
  previewData: {
    patientName: 'Maria',
    date: '15 de janeiro de 2026',
    time: '14:00',
    duration: '50',
    type: 'online',
    psychologistName: 'Dra. Ana Silva',
    clinicName: 'Clínica Bem-Estar',
    portalUrl: 'https://psicoone.com/portal/abc123',
    hoursAhead: '24',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const logoWrap: React.CSSProperties = { textAlign: 'center', marginBottom: '30px' }
const logoIcon: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'hsl(217, 91%, 60%)',
  color: '#ffffff',
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  lineHeight: '48px',
  fontSize: '20px',
  fontWeight: 'bold',
  textAlign: 'center',
}
const logoText = { margin: '10px 0 0', fontSize: '24px', color: 'hsl(222, 47%, 11%)' }
const greeting = { fontSize: '16px', color: 'hsl(222, 47%, 11%)', margin: '0 0 8px' }
const text = { fontSize: '16px', color: 'hsl(222, 47%, 11%)', margin: '0 0 20px' }
const detailsBox: React.CSSProperties = {
  backgroundColor: '#f0f4ff',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0',
  borderLeft: '4px solid hsl(217, 91%, 60%)',
}
const detailLabel = { margin: '0 0 4px', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }
const detailValue = { margin: '0 0 16px', fontSize: '16px', fontWeight: '600' as const, color: 'hsl(222, 47%, 11%)' }
const detailMuted = { margin: '16px 0 0', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }
const ctaWrap: React.CSSProperties = { textAlign: 'center', margin: '30px 0' }
const ctaButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'hsl(217, 91%, 60%)',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '0.75rem',
  fontSize: '16px',
  fontWeight: '600',
}
const footnote = { fontSize: '13px', color: 'hsl(220, 9%, 46%)', textAlign: 'center' as const }
const hr = { border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999', textAlign: 'center' as const, whiteSpace: 'pre-line' as const }
