# Flow
Flow is a simple system that centralizes and manages the administrative supply process, from requesting supplies to ensuring their proper receipt at each branch.

## Development

Install all workspace dependencies with Bun:

```sh
bun install
```

Run either application from the repository root:

```sh
bun run dev:api
bun run dev:web
```

Build the workspace with `bun run build`.

Before using authentication against a database, apply migrations and create the first super admin:

```sh
bun run --filter api db:migrate
INITIAL_SUPER_ADMIN_USERNAME=flow-admin INITIAL_SUPER_ADMIN_PASSWORD='use-a-long-unique-password' bun run --filter api db:bootstrap-super-admin
```

The initial password must contain at least 12 characters. The bootstrap command only runs when
there is no active super admin.
