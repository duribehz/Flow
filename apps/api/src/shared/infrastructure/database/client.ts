import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { z } from 'zod'

import * as schema from './schema.js'

const databaseEnvironmentSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
})

const result = databaseEnvironmentSchema.safeParse(process.env)

if (!result.success) {
  throw new Error(
    `Invalid database environment:\n${z.prettifyError(result.error)}`,
  )
}

const databaseEnvironment = result.data

export const pool = new Pool({
  host: databaseEnvironment.DB_HOST,
  port: databaseEnvironment.DB_PORT,
  user: databaseEnvironment.DB_USERNAME,
  password: databaseEnvironment.DB_PASSWORD,
  database: databaseEnvironment.DB_DATABASE,
  ssl:
    databaseEnvironment.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, {
  schema,
  casing: 'snake_case',
})
