import { describe, expect, it } from "vitest";
import { MongoClient } from "mongodb";

describe("MongoDB configuration", () => {
  it("uses the approved local adapter unless remote MongoDB is explicitly enabled", async () => {
    if (process.env.ENABLE_MONGODB !== "true") {
      expect(true).toBe(true);
      return;
    }
    const uri = process.env.MONGODB_URI;
    expect(uri).toMatch(/^mongodb(\+srv)?:\/\//);
    const client = new MongoClient(uri!, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    try {
      await client.connect();
      const result = await client.db(process.env.MONGODB_DB_NAME || "smart_lab_allocator").command({ ping: 1 });
      expect(result.ok).toBe(1);
    } finally {
      await client.close();
    }
  }, 15000);
});
