import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// schema disertakan agar query relasional db.query.* tersedia (mis. findFirst user).
export const db = drizzle(process.env.DATABASE_URL!, { schema });