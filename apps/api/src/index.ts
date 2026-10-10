import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`Flow API listening on http://localhost:${port}`)
