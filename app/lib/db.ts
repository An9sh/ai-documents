// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "../../db/schema";

// neonConfig.webSocketConstructor = ws;

// // Only initialize the database connection on the server side
// let pool: Pool | null = null;
// let db: ReturnType<typeof drizzle> | null = null;

// if (typeof window === 'undefined') {
//   if (!process.env.DATABASE_URL) {
//     throw new Error(
//       "DATABASE_URL must be set. Did you forget to provision a database?",
//     );
//   }
//   pool = new Pool({ connectionString: process.env.DATABASE_URL });
//   db = drizzle({ client: pool, schema });
// }

// export { pool, db };


import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "../../db/schema";

config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
