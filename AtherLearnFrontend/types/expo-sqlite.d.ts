declare module "expo-sqlite" {
  export type SQLiteDatabase = {
    execAsync(sql: string): Promise<void>;
    runAsync(sql: string, params?: unknown[] | Record<string, unknown>): Promise<unknown>;
    getAllAsync<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[] | Record<string, unknown>
    ): Promise<T[]>;
  };

  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}
