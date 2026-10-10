# Flow Web

Frontend built with React, Vite, TanStack Router, shadcn/ui, Orval, SWR, and Zustand.

## Development

Copy `.env.example` to `.env` and set the backend URL, then run:

```bash
npm run dev
```

Routes are defined as files under `src/routes`. TanStack Router generates
`src/routeTree.gen.ts` automatically.

## API client

The backend must expose a valid OpenAPI document. By default Orval reads it
from `http://localhost:3000/openapi.json`; override that source with
`OPENAPI_URL` when needed.

```bash
npm run api:generate
npm run api:watch
```

Generated SWR hooks and TypeScript models are written to `src/api/generated`.
