import { config } from "dotenv";
import path from "node:path";

const candidates = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../.env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.local")
];

for (const envPath of candidates) {
  config({ path: envPath });
}
