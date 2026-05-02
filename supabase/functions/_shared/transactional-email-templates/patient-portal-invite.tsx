/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PsicoOne'

interface Props {
  patientName?: string
  psychologistName?: string
  inviteUrl?: string
  expiresInDays?: number
}

const PatientPortalInviteEmail = ({
  patientName,
  psychologistName,
  inviteUrl,
  expiresInDays = 7,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu profissional convidou você para o Portal do Paciente</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <div style={logoIcon}>P</div>
          <Heading style={logoText}>{SITE_NAME}</Heading>
        </div>

        <Heading style={h1}>👋 Você foi convidado(a) para o Portal do Paciente</Heading>

        <Text style={greeting}>Olá{patientName ? `, ${patientName.split(' ')[0]}` : ''}!</Text>

        <Text style={paragraph}>
          {psychologistName ? `${psychologistName} ` : 'Seu profissional '} criou um acesso pessoal
          para você no <strong>{SITE_NAME}</strong>. No portal você pode:
        </Text>

        <Section style={featureBox}>
          <Text style={featureLine}>📅 Ver e confirmar suas próximas sessões</Text>
          <Text style={featureLine}>🔄 Solicitar reagendamento</Text>
          <Text style={featureLine}>💰 Acompanhar seus pagamentos</Text>
          <Text style={featureLine}>🎥 Entrar nas sessões online com 1 clique</Text>
          <Text style={featureLine}>💬 Conversar diretamente com seu profissional</Text>
        </Section>

        {inviteUrl && (
          <Section style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button href={inviteUrl} style={button}>
              Ativar meu acesso
            </Button>
          </Section>
        )}

        <Text style={smallNote}>
          Este convite é válido por <strong>{expiresInDays} dias</strong>. Após esse período, será
          necessário pedir um novo convite ao seu profissional.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Se você não esperava este convite, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: PatientPortalInviteEmail,
  subject: (data) =>
    `Seu acesso ao Portal do Paciente${data.psychologistName ? ` — ${data.psychologistName}` : ''}`,
  displayName: 'Convite para Portal do Paciente',
  previewData: {
    patientName: 'João Silva',
    psychologistName: 'Dra. Marina Rocha',
    inviteUrl: 'https://psicoone.app/portal/aceitar-convite/abc123',
    expiresInDays: 7,
  },
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', padding: '40px 0' }
const container = { backgroundColor: '#ffffff', maxWidth: '560px', margin: '0 auto', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }
const logoWrap = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }
const logoIcon = { width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }
const logoText = { margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }
const h1 = { fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }
const greeting = { fontSize: '15px', color: '#0f172a', marginBottom: '8px' }
const paragraph = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '8px 0 16px' }
const featureBox = { backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' }
const featureLine = { margin: '6px 0', fontSize: '14px', color: '#0c4a6e', lineHeight: '1.5' }
const button = { backgroundColor: '#3b82f6', color: '#fff', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600, display: 'inline-block' }
const smallNote = { fontSize: '12px', color: '#64748b', marginTop: '16px', textAlign: 'center' as const }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, lineHeight: '1.5' }
