```
bun install
bun run dev
```

```
open http://localhost:3000
```

Set `PORT` to use a different port. Production platforms can provide this
environment variable automatically.

## Demo restaurant data

Start the local PostgreSQL service and apply migrations, then load the demo data:

```sh
docker compose up -d --wait
bun run db:migrate
bun run db:seed
```

The seed is safe to run repeatedly. It adds the **La Mesa Centro** and **La Mesa
Norte** branches, restaurant suppliers, categories, units, usage purposes, and
16 sample supplies with active branch settings and weekly targets. The sample
records are for development/testing and are not loaded in production.
