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
- `migrations/` — histórico de como o schema chegou até aqui. As migrations até `014` são da era MySQL e não se aplicam mais; novas migrations a partir de agora devem ser escritas em sintaxe Postgres.
- `seeds/` — dados de exemplo para desenvolvimento
- `zync.dbml` / `zync-er-diagram.pdf` — diagrama ER (dbdiagram.io)
