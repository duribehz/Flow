# Railway deployment

Flow can run independently from the existing Vercel site. Use two Railway services and a Railway PostgreSQL service:

- `web`, using `Dockerfile.web`, for `flow.currucucu.com.mx`.
- `api`, using `Dockerfile.api`, for `api.currucucu.com.mx`.
- A private PostgreSQL service for production data.

For both app services, set the repository root as the build context and select the matching Dockerfile.

## API variables

Set `NODE_ENV=production`, `WEB_ORIGIN=https://flow.currucucu.com.mx`, and map the PostgreSQL service's private variables to `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE`. Railway supplies `PORT` to the API service.

The API container applies pending migrations before starting the server.

Run the initial Super admin bootstrap once from the API service environment after migrations, setting `INITIAL_SUPER_ADMIN_USERNAME` and `INITIAL_SUPER_ADMIN_PASSWORD` and running:

```sh
bun src/shared/infrastructure/database/bootstrap-super-admin.ts
```

## Web variables

Set `API_PUBLIC_URL=https://api.currucucu.com.mx`. The web container serves the built SPA and supplies this URL at runtime, so it does not need a rebuild when the API URL changes.

## DNS

In the DNS provider currently managing `currucucu.com.mx` (Vercel DNS if the domain uses Vercel nameservers), add the CNAME and TXT verification records Railway shows for each custom domain. Leave the apex/root records for the existing Vercel site unchanged. A subdomain such as `flow.currucucu.com.mx` does not require a separate purchase.

## Real data

Do not run the demo `db:seed` command in production. After deployment and migrations, register articles from **Artículos → Agregar artículo**. The CSV import was removed; articles are created and edited one by one, and they can be deactivated (logical delete) instead of deleted.

Users are managed from **Usuarios** by the super admin: create, edit (name, role between administrador and gerente, password) and deactivate. The super admin cannot be edited or deactivated from the UI.
