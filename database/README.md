# Banco de dados — Zync

MySQL. Para rodar localmente:

```
mysql -u root -p < schema.sql
mysql -u root -p < seeds/seed.sql
```

- `schema.sql` — estrutura das tabelas
- `migrations/` — alterações futuras no schema (uma arquivo por mudança)
- `seeds/` — dados de exemplo para desenvolvimento
