import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { DEFAULT_CONTENT } from "../lib/site-content";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@reemweb.com").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is not set. Provide a strong seed password in .env.local.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const existing = await db.collection("admins").findOne({ email });
  if (existing) {
    console.log(`Admin "${email}" already exists — skipping user creation.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.collection("admins").insertOne({
      email,
      passwordHash,
      name: "Admin",
      role: "admin",
      createdAt: new Date(),
    });
    console.log(`Created admin user: ${email}`);
  }

  const existingContent = await db.collection("content").findOne({ _id: "site-content" as any });
  if (existingContent) {
    console.log("Site content already exists — skipping default content seed.");
  } else {
    await db.collection("content").insertOne({ _id: "site-content" as any, ...DEFAULT_CONTENT });
    console.log("Seeded default site content.");
  }

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
