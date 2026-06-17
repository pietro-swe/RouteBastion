import { inject } from "vitest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = inject("databaseUrl");
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.REDIS_PASSWORD = "test";
