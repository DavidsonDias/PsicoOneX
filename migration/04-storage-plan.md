# 04 — Plano de Storage

## Inventário
| Bucket | Público | Objetos | Bytes |
|---|---|---|---|
| medical-attachments | não | 23 | 52.386.909 |
| patient-documents | não | 5 | 2.698.817 |
| database_export_11_09_26 | não | 1 | 36.555.046 |
| financial-attachments | não | 0 | 0 |

Total: **29 objetos, ~91,6 MB**. Volume pequeno — cópia manual é viável em minutos.

9 policies em `storage.objects` (por dono via primeiro segmento do path, super admin em anexos financeiros, `service_role` em documentos de paciente).

## Referências no banco (não podem quebrar)
- `medical_record_attachments.file_path` (20 registros) — path relativo dentro de `medical-attachments`.
- `financial_transactions.attachment_url`, `.receipt_url`.
- `patients.uploaded_documents` (jsonb com paths do onboarding, bucket `patient-documents`).
- `profiles.avatar_url`, `profiles.logo_url`.

**Regra:** os objetos devem ser recriados no destino com **bucket e path idênticos**. Assim nenhuma referência no banco precisa ser reescrita. Se alguma coluna guardar URL absoluta (com o host antigo), será necessário um `UPDATE` controlado trocando o host — verificar antes com a query do `08-validation.sql`.

## Estratégia de cópia
1. Criar os 4 buckets no destino, todos **privados** (bloco G do `02-schema.sql`).
2. Recriar as 9 policies de `storage.objects` a partir das migrations existentes.
3. Copiar objetos preservando o path: para cada objeto listado no preflight (`select bucket_id, name from storage.objects`), baixar da origem com URL assinada (service_role) e subir no destino com `upload(path, file, { contentType, upsert: true })`.
4. `database_export_11_09_26` (36,6 MB) é um backup antigo — copiar por último ou descartar por decisão sua; não é referenciado pelo app.
5. Validar: contagem por bucket igual, e cada `file_path` de `medical_record_attachments` existente em `storage.objects`.

## Observações
- `storage.objects` **não** deve ser inserido via SQL: os metadados são criados pelo upload. Inserir linhas sem o objeto físico gera anexos que abrem em erro.
- Signed URLs antigas expiram e não são migráveis — o app já gera signed URL sob demanda, então nada a fazer.
- Nenhum bucket é público → nenhuma URL pública quebra.

## Classificação
| Item | Classe |
|---|---|
| Buckets | RECONFIGURAR (criar no destino) |
| Objetos (29 arquivos) | MIGRAR MANUALMENTE |
| Policies de storage | MIGRAR MANUALMENTE (a partir das migrations) |
| Paths/refs no banco | COMPATÍVEL (se path preservado) |
| URLs absolutas eventuais em colunas | CRÍTICO (verificar e corrigir) |
