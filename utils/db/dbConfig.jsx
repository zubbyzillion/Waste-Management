// psql 'postgresql://neondb_owner:npg_nYVwGWAm56lZ@ep-silent-unit-adlojgsj-pooler.c-2.us-east-1.aws.neon.tech/wasteManagement?sslmode=require&channel_binding=require'

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"
const sql = neon(process.env.DATABASE_URL)

export const db = drizzle(sql, {schema})