-- Salas permanentes por paciente: múltiplas sessões podem compartilhar o mesmo room_token.
-- A constraint UNIQUE em room_token quebra a criação de novos agendamentos online
-- quando o paciente já tem uma sessão anterior usando seu room_token permanente.
ALTER TABLE public.telehealth_sessions DROP CONSTRAINT IF EXISTS telehealth_sessions_room_token_key;

-- Índice não único para manter performance de busca por token
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_room_token ON public.telehealth_sessions(room_token);