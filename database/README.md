# Banco de dados — Zync

PostgreSQL via Supabase (migrado de MySQL em 2026-06-24).

Pra aplicar o schema num projeto Supabase: abre o **SQL Editor** no painel do
Supabase, cola o conteúdo de `schema.sql`, roda. Depois cola `seeds/seed.sql`
se quiser dados de exemplo.

Localmente (com Postgres instalado), também funciona via `psql`:

```
psql "<connection-string-do-supabase>" -f schema.sql
psql "<connection-string-do-supabase>" -f seeds/seed.sql
```

- `schema.sql` — estrutura atual das tabelas (sempre o estado final, em sintaxe Postgres)
- `migrations/` — histórico de como o schema chegou até aqui. As migrations até `015` são da era MySQL e não se aplicam mais (a `015` foi escrita antes da migração pra Postgres ser concluída); novas migrations a partir de agora devem ser escritas em sintaxe Postgres.
- `seeds/` — dados de exemplo para desenvolvimento
- `zync.dbml` / `zync-er-diagram.pdf` — diagrama ER (dbdiagram.io)
- `scripts/backup.js` / `scripts/restore.js` — backup manual e restore (ver abaixo)
- `scripts/setup-staging-schema.js` — cria/atualiza o schema de staging (ver abaixo)

## Backup

O Supabase free não tem backup automático (só a partir do plano Pro). Pra
cobrir isso, tem um backup diário automático via GitHub Actions
(`.github/workflows/backup.yml`, 03h horário de Brasília), que dumpa todas as
tabelas em JSON e guarda como artifact do workflow por 90 dias (aba
**Actions** do repo no GitHub → roda mais recente → "Artifacts").

Precisa de um secret `DATABASE_URL` configurado no repo (**Settings** →
**Secrets and variables** → **Actions**), com a mesma connection string do
Supabase usada no backend.

Pra rodar manualmente (backup ou restore):

```
cd database
npm install
DATABASE_URL="<connection-string>" npm run backup
DATABASE_URL="<connection-string>" node scripts/restore.js backups/backup-XXX.json
```

`restore.js` **apaga** o conteúdo atual de cada tabela antes de restaurar
(`TRUNCATE ... CASCADE`) — não rodar contra produção sem certeza do que tá
fazendo.

## Staging

Em vez de um projeto Supabase separado, staging usa um **schema separado**
(`zync_staging`) dentro do mesmo projeto Supabase de produção — mesmo padrão
já usado pelos testes automatizados (schema `zync_test`). Mais simples de
manter, mas atenção: staging e produção compartilham a mesma cota/projeto
Supabase.

O backend escolhe o schema pela env var `PG_SCHEMA` (ver
`backend/src/config/db.js`). Sem ela (e fora de `NODE_ENV=test`), usa o
schema padrão `public` (produção).

Pra criar/atualizar o schema de staging (idempotente, seguro rodar de novo):

```
cd database
npm install
DATABASE_URL="<mesma connection string do Supabase>" npm run setup-staging
```

Isso cria o schema `zync_staging` (se não existir), aplica `schema.sql` nele
e insere planos de exemplo se a tabela estiver vazia.

**Importante:** toda nova migration em `migrations/` precisa ser aplicada
manualmente nos dois lugares — schema `public` (produção) e `zync_staging`
— já que `npm run setup-staging` só roda o `schema.sql` (estado final), não
o histórico de migrations incrementais.

No Railway, o ambiente `staging` (quando criado) deve ter as mesmas
variáveis do `production`, mas com `PG_SCHEMA=zync_staging` adicionada. Ver
`backend/README.md` para o passo a passo de criar esse ambiente.
