import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

const DEBTS_KEY = "dt_debts";

export type Debt = {
  id: string;
  userId: string;
  name: string; 
  amount:
    {
      id: string;
      amount: number;
      description?: string;  
      image?: string;
      createdAt?: number;
    }[];
};

// Open SQLite database synchronously
const db = SQLite.openDatabaseSync("debts.db");

// Initialize database schema
db.execSync(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    debtId TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    image TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (debtId) REFERENCES debts (id) ON DELETE CASCADE
  );
`);

/**
 * Wipes ALL rows from debts and transactions tables.
 * Called when a different user logs in on this device.
 */
export async function wipeAllDebts(): Promise<void> {
  try {
    db.withTransactionSync(() => {
      db.runSync(`DELETE FROM transactions`);
      db.runSync(`DELETE FROM debts`);
    });
    console.log("wipeAllDebts: SQLite cleared for new user.");
  } catch (error) {
    console.error("SQLite wipeAllDebts error:", error);
    throw error;
  }
}

export async function getDebts(): Promise<Debt[]> {
  try {
    const rows = await db.getAllAsync(`SELECT * FROM debts`) as any[];
    const debts: Debt[] = [];
    
    for (const row of rows) {
      const amountRows = await db.getAllAsync(
        `SELECT * FROM transactions WHERE debtId = ? ORDER BY createdAt ASC`,
        [row.id]
      ) as any[];
      
      debts.push({
        id: row.id,
        userId: row.userId,
        name: row.name,
        amount: amountRows.map((ar) => ({
          id: ar.id,
          amount: ar.amount,
          description: ar.description || undefined,
          image: ar.image || undefined,
          createdAt: ar.createdAt,
        })),
      });
    }
    return debts;
  } catch (error) {
    console.error("SQLite getDebts error:", error);
    return [];
  }
}

export async function getUserDebts(): Promise<Debt[]> {
  try {
    const sessionRaw = await AsyncStorage.getItem("dt_session");
    if (!sessionRaw) return [];

    const session = JSON.parse(sessionRaw);
    const userId = session.userId;

    const rows = await db.getAllAsync(`SELECT * FROM debts WHERE userId = ?`, [userId]) as any[];
    

    const debts: Debt[] = [];
    for (const row of rows) {
      const amountRows = await db.getAllAsync(
        `SELECT * FROM transactions WHERE debtId = ? ORDER BY createdAt ASC`,
        [row.id]
      ) as any[];
      
      debts.push({
        id: row.id,
        userId: row.userId,
        name: row.name,
        amount: amountRows.map((ar) => ({
          id: ar.id,
          amount: ar.amount,
          description: ar.description || undefined,
          image: ar.image || undefined,
          createdAt: ar.createdAt,
        })),
      });
    }
    return debts;
  } catch (error) {
    console.error("SQLite getUserDebts error:", error);
    return [];
  }
}

export async function addDebt(data: Omit<Debt, "id" | "userId">) {
  try {
    const sessionRaw = await AsyncStorage.getItem("dt_session");
    if (!sessionRaw) throw new Error("No session");

    const session = JSON.parse(sessionRaw);
    const userId = session.userId;
    const debtId = Date.now().toString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO debts (id, userId, name) VALUES (?, ?, ?)`,
        [debtId, userId, data.name]
      );

      if (data.amount && Array.isArray(data.amount)) {
        for (const item of data.amount) {
          db.runSync(
            `INSERT INTO transactions (id, debtId, amount, description, image, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              debtId,
              item.amount,
              item.description || null,
              item.image || null,
              item.createdAt || Date.now(),
            ]
          );
        }
      }
    });
  } catch (error) {
    console.error("SQLite addDebt error:", error);
    throw error;
  }
}

export async function saveDebts(debts: Debt[]) {
  try {
    const sessionRaw = await AsyncStorage.getItem("dt_session");
    if (!sessionRaw) throw new Error("No session");

    const session = JSON.parse(sessionRaw);
    const userId = session.userId;

    db.withTransactionSync(() => {
      // Delete old records for this user only
      // Get all debt IDs for this user
      const userDebtRows = db.getAllSync(`SELECT id FROM debts WHERE userId = ?`, [userId]) as any[];
      const userDebtIds = userDebtRows.map((r) => r.id);

      if (userDebtIds.length > 0) {
        // SQLite doesn't directly support array bindings, so we delete transactions for these specific IDs
        const placeholders = userDebtIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM transactions WHERE debtId IN (${placeholders})`,
          userDebtIds
        );
        db.runSync(
          `DELETE FROM debts WHERE userId = ?`,
          [userId]
        );
      }

      // Re-insert modern list
      for (const d of debts) {
        db.runSync(
          `INSERT INTO debts (id, userId, name) VALUES (?, ?, ?)`,
          [d.id, userId, d.name]
        );

        for (const item of d.amount) {
          db.runSync(
            `INSERT INTO transactions (id, debtId, amount, description, image, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              d.id,
              item.amount,
              item.description || null,
              item.image || null,
              item.createdAt || Date.now(),
            ]
          );
        }
      }
    });
  } catch (error) {
    console.error("SQLite saveDebts error:", error);
    throw error;
  }
}

export async function clearUserDebts(): Promise<void> {
  try {
    const sessionRaw = await AsyncStorage.getItem("dt_session");
    if (!sessionRaw) throw new Error("No session");

    const session = JSON.parse(sessionRaw);
    const userId = session.userId;

    db.withTransactionSync(() => {
      // Get all debt IDs for this user
      const userDebtRows = db.getAllSync(`SELECT id FROM debts WHERE userId = ?`, [userId]) as any[];
      const userDebtIds = userDebtRows.map((r) => r.id);

      if (userDebtIds.length > 0) {
        const placeholders = userDebtIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM transactions WHERE debtId IN (${placeholders})`,
          userDebtIds
        );
        db.runSync(
          `DELETE FROM debts WHERE userId = ?`,
          [userId]
        );
      }
    });

    // Also remove any legacy key
    await AsyncStorage.removeItem("dt_debts");
  } catch (error) {
    console.error("SQLite clearUserDebts error:", error);
    throw error;
  }
}