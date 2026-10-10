import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target:
        process.env.OPENAPI_URL ?? 'http://localhost:3000/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/models',
      client: 'swr',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/api/http-client.ts',
          name: 'apiClient',
        },
      },
    },
  },
})
