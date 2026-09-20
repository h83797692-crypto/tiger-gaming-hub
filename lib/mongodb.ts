import { MongoClient, type ClientSession, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Copy .env.example to .env.local and set it to your MongoDB Atlas connection string."
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

export async function withMongoTransaction<T>(
  operation: (db: Db, session: ClientSession) => Promise<T>
): Promise<T> {
  const client = await getClientPromise();
  const session = client.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await operation(client.db(), session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}