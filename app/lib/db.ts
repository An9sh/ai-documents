import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "../../db/schema";

config({ path: ".env.local" });

const sql = neon("postgresql://neondb_owner:npg_3EGUoODJZxq7@ep-old-wildflower-a5al5x64-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require");
export const db = drizzle(sql, { schema });