import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { SCHEMA_CONTRACT, type TableName } from './schema';
import { createTestDatabase } from './testing/createTestDatabase';

/**
 * Keeps the hand-written row types honest.
 *
 * Types generated once and then edited are the usual way a TypeScript codebase
 * ends up confidently wrong about its own database. This walks
 * `information_schema` in a real Postgres running the real migrations and
 * asserts the declared shape matches — so adding, dropping, renaming a column
 * or changing its nullability fails CI until `schema.ts` catches up.
 */

interface ColumnInfo {
  table_name: string;
  column_name: string;
  is_nullable: 'YES' | 'NO';
}

let columnsByTable: Map<string, Map<string, boolean>>;

beforeAll(async () => {
  const db: PGlite = await createTestDatabase();

  const result = await db.query<ColumnInfo>(
    `select table_name, column_name, is_nullable
     from information_schema.columns
     where table_schema = 'public'
     order by table_name, ordinal_position`,
  );

  columnsByTable = new Map();
  for (const column of result.rows) {
    let table = columnsByTable.get(column.table_name);
    if (!table) {
      table = new Map();
      columnsByTable.set(column.table_name, table);
    }
    table.set(column.column_name, column.is_nullable === 'YES');
  }
});

const tableNames = Object.keys(SCHEMA_CONTRACT) as TableName[];

describe('schema contract', () => {
  it('declares every table the database has', () => {
    expect([...columnsByTable.keys()].sort()).toEqual([...tableNames].sort());
  });

  describe.each(tableNames)('%s', (tableName) => {
    it('has exactly the declared columns', () => {
      const actual = columnsByTable.get(tableName);
      expect(actual, `table ${tableName} is missing from the database`).toBeDefined();

      const declared = Object.keys(SCHEMA_CONTRACT[tableName]).sort();
      const found = [...(actual as Map<string, boolean>).keys()].sort();

      expect(found).toEqual(declared);
    });

    it('agrees with the database about which columns are nullable', () => {
      const actual = columnsByTable.get(tableName) as Map<string, boolean>;
      const declared = SCHEMA_CONTRACT[tableName] as Record<string, boolean>;

      const mismatches = Object.entries(declared)
        .filter(([column, nullable]) => actual.get(column) !== nullable)
        .map(([column, nullable]) => ({
          column,
          declared: nullable ? 'nullable' : 'not null',
          actual: actual.get(column) ? 'nullable' : 'not null',
        }));

      // A column typed as non-nullable that the database will happily return
      // as null is the kind of mismatch that only shows up as a runtime crash
      // in front of a user.
      expect(mismatches).toEqual([]);
    });
  });
});
