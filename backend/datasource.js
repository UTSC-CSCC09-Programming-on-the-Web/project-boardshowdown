import pg from "pg";

export const client = new pg.Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  database: "postgres",
});

await client.connect(); 