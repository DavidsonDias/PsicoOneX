-- Additive staging proposal. Existing enqueue_email callers remain unchanged.
CREATE TABLE public.email_enqueue_receipts (
  key_hash bytea PRIMARY KEY,
  content_hash bytea NOT NULL,
  message_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  queue_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_enqueue_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_enqueue_receipts FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.enqueue_transactional_email_once(
  request_key text, payload jsonb, log_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  receipt public.email_enqueue_receipts%ROWTYPE;
  key_digest bytea;
  content_digest bytea;
  new_receipt boolean;
  result_state text;
BEGIN
  IF request_key IS NULL OR length(btrim(request_key)) = 0 OR octet_length(request_key) > 512
    OR jsonb_typeof(payload) IS DISTINCT FROM 'object'
    OR jsonb_typeof(coalesce(log_metadata, '{}'::jsonb)) IS DISTINCT FROM 'object'
    OR coalesce(payload->>'to', '') = '' OR coalesce(payload->>'from', '') = ''
    OR coalesce(payload->>'label', '') = '' OR coalesce(payload->>'subject', '') = ''
    OR (coalesce(payload->>'html', '') = '' AND coalesce(payload->>'text', '') = '') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid email request';
  END IF;
  key_digest := sha256(convert_to(request_key, 'UTF8'));
  content_digest := sha256(convert_to(jsonb_build_object(
    'payload', payload - ARRAY['message_id','queued_at','idempotency_key','unsubscribe_token'],
    'metadata', coalesce(log_metadata, '{}'::jsonb)
  )::text, 'UTF8'));

  -- A competing transaction waits at the unique constraint. Its next SELECT
  -- sees the committed receipt under READ COMMITTED; serialization failures
  -- at stricter isolation levels must be retried by the caller.
  INSERT INTO public.email_enqueue_receipts(key_hash, content_hash)
  VALUES (key_digest, content_digest) ON CONFLICT DO NOTHING RETURNING * INTO receipt;
  new_receipt := FOUND;
  IF NOT new_receipt THEN
    SELECT * INTO STRICT receipt FROM public.email_enqueue_receipts
      WHERE key_hash = key_digest FOR UPDATE;
    IF receipt.content_hash <> content_digest THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency key conflicts with existing content';
    END IF;
    IF EXISTS (SELECT 1 FROM public.email_send_log
      WHERE message_id = receipt.message_id::text AND status = 'sent') THEN
      result_state := 'sent';
    ELSIF receipt.created_at < now() - interval '60 minutes' THEN
      result_state := 'expired';
    ELSIF EXISTS (SELECT 1 FROM pgmq.q_transactional_emails WHERE msg_id = receipt.queue_id) THEN
      result_state := 'queued';
    ELSE
      result_state := 'unavailable';
    END IF;
  ELSE
    receipt.queue_id := pgmq.send('transactional_emails', payload || jsonb_build_object(
      'message_id', receipt.message_id::text, 'queued_at', now(), 'idempotency_key', request_key
    ));
    INSERT INTO public.email_send_log(message_id, template_name, recipient_email, status, metadata)
    VALUES (receipt.message_id::text, payload->>'label', payload->>'to', 'pending',
      coalesce(log_metadata, '{}'::jsonb) || jsonb_build_object('idempotency_key', request_key));
    UPDATE public.email_enqueue_receipts SET queue_id = receipt.queue_id WHERE key_hash = key_digest;
    result_state := 'queued';
  END IF;
  RETURN jsonb_build_object('state', result_state, 'message_id', receipt.message_id::text,
    'queue_id', receipt.queue_id, 'duplicate', NOT new_receipt);
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_transactional_email_once(text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_transactional_email_once(text,jsonb,jsonb) TO service_role;
COMMENT ON FUNCTION public.enqueue_transactional_email_once(text,jsonb,jsonb) IS
  'Internal transactional queue only. Receipt, queue and pending log commit atomically. No automatic requeue after expiry/removal.';

