/**
 * A small in-memory stand-in for the Prisma client, used so route-handler tests
 * can run without PostgreSQL.
 *
 * What it is for: checking that route handlers pass the right filters (above
 * all the tenant filter) to the data layer and react correctly to what comes
 * back, using rows from more than one organization.
 *
 * What it is NOT: a model of PostgreSQL or of Prisma's query engine. It only
 * implements the handful of operations and filter operators the routes use, and
 * throws on anything else so that a new query shape forces an update here
 * instead of being silently mis-evaluated. Behaviour that depends on the real
 * database (row locking, constraint errors, concurrent transactions) is not
 * covered by these tests.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

export type Row = Record<string, unknown>;

type Args = {
  where?: Row;
  select?: Row;
  include?: Row;
  orderBy?: Record<string, "asc" | "desc">;
  take?: number;
  data?: Row;
  _sum?: Record<string, boolean>;
};

export const MODELS = [
  "organization",
  "user",
  "matter",
  "draft",
  "timeEntry",
] as const;
export type ModelName = (typeof MODELS)[number];

type Relation = { model: ModelName; foreignKey: string };

const RELATIONS: Partial<Record<ModelName, Record<string, Relation>>> = {
  draft: {
    matter: { model: "matter", foreignKey: "matterId" },
    user: { model: "user", foreignKey: "userId" },
  },
  timeEntry: {
    matter: { model: "matter", foreignKey: "matterId" },
    user: { model: "user", foreignKey: "userId" },
  },
};

const DEFAULTS: Record<ModelName, () => Row> = {
  organization: () => ({ subscriptionTier: "Standard", createdAt: new Date() }),
  user: () => ({
    role: "FEE_EARNER",
    monthlyBillableTarget: 120,
    createdAt: new Date(),
  }),
  matter: () => ({ status: "ACTIVE", createdAt: new Date() }),
  draft: () => ({
    matterId: null,
    sourcePlatform: "Outlook",
    units: 1,
    timestamp: new Date(),
  }),
  timeEntry: () => ({
    syncStatus: "PENDING",
    syncLock: false,
    createdAt: new Date(),
  }),
};

function isPlainObject(value: unknown): value is Row {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    !Prisma.Decimal.isDecimal(value) &&
    !Array.isArray(value)
  );
}

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;

  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") {
      return (condition as Row[]).some((branch) => matches(row, branch));
    }
    if (key === "AND") {
      return (condition as Row[]).every((branch) => matches(row, branch));
    }

    const value = row[key];
    if (!isPlainObject(condition)) return value === condition;

    return Object.entries(condition).every(([operator, argument]) => {
      switch (operator) {
        case "in":
          return (argument as unknown[]).includes(value);
        case "not":
          return value !== argument;
        case "gte":
          return (value as Date).getTime() >= (argument as Date).getTime();
        case "mode":
          return true; // evaluated together with "contains"
        case "contains": {
          const insensitive = condition.mode === "insensitive";
          const haystack = insensitive
            ? String(value).toLowerCase()
            : String(value);
          const needle = insensitive
            ? String(argument).toLowerCase()
            : String(argument);
          return haystack.includes(needle);
        }
        default:
          throw new Error(
            `fake-prisma: unsupported filter operator "${operator}"`,
          );
      }
    });
  });
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export type FailureRule = {
  model: ModelName;
  operation: string;
  /** 1-based call number (counted per model and operation) that should fail. */
  onCall: number;
  error: Error;
};

export function createFakePrisma() {
  const tables = Object.fromEntries(
    MODELS.map((name) => [name, [] as Row[]]),
  ) as Record<ModelName, Row[]>;

  const callCounts = new Map<string, number>();
  let failures: FailureRule[] = [];

  const hooks: { beforeTransaction?: () => void } = {};

  function guard(model: ModelName, operation: string) {
    const key = `${model}.${operation}`;
    const count = (callCounts.get(key) ?? 0) + 1;
    callCounts.set(key, count);
    const rule = failures.find(
      (f) =>
        f.model === model && f.operation === operation && f.onCall === count,
    );
    if (rule) throw rule.error;
  }

  function loadRelation(
    row: Row,
    relation: Relation,
    spec: unknown,
  ): Row | null {
    const foreignId = row[relation.foreignKey];
    if (foreignId == null) return null;
    const related = tables[relation.model].find((r) => r.id === foreignId);
    if (!related) return null;
    return isPlainObject(spec)
      ? project(related, spec as Args, relation.model)
      : { ...related };
  }

  function project(row: Row, args: Args, model: ModelName): Row {
    const relations = RELATIONS[model] ?? {};
    let result: Row = { ...row };

    if (args.select) {
      result = {};
      for (const [key, spec] of Object.entries(args.select)) {
        if (!spec) continue;
        const relation = relations[key];
        result[key] = relation
          ? loadRelation(row, relation, spec)
          : row[key];
      }
    }

    if (args.include) {
      for (const [key, spec] of Object.entries(args.include)) {
        const relation = relations[key];
        if (!relation) {
          throw new Error(`fake-prisma: unknown relation "${model}.${key}"`);
        }
        result[key] = loadRelation(row, relation, spec);
      }
    }

    return result;
  }

  function find(model: ModelName, args: Args = {}): Row[] {
    let rows = tables[model].filter((row) => matches(row, args.where));

    if (args.orderBy) {
      const [[field, direction]] = Object.entries(args.orderBy);
      rows = [...rows].sort((a, b) => {
        const order = compareValues(a[field], b[field]);
        return direction === "desc" ? -order : order;
      });
    }
    if (typeof args.take === "number") rows = rows.slice(0, args.take);

    return rows.map((row) => project(row, args, model));
  }

  function delegate(model: ModelName) {
    return {
      async findMany(args?: Args) {
        guard(model, "findMany");
        return find(model, args);
      },
      async findFirst(args?: Args) {
        guard(model, "findFirst");
        return find(model, { ...args, take: 1 })[0] ?? null;
      },
      async count(args?: Args) {
        guard(model, "count");
        return tables[model].filter((row) => matches(row, args?.where)).length;
      },
      async create(args: Args) {
        guard(model, "create");
        const row: Row = {
          id: randomUUID(),
          ...DEFAULTS[model](),
          ...args.data,
        };
        tables[model].push(row);
        return { ...row };
      },
      async updateMany(args: Args) {
        guard(model, "updateMany");
        const targets = tables[model].filter((row) => matches(row, args.where));
        for (const row of targets) Object.assign(row, args.data);
        return { count: targets.length };
      },
      async deleteMany(args: Args) {
        guard(model, "deleteMany");
        const before = tables[model].length;
        tables[model] = tables[model].filter(
          (row) => !matches(row, args.where),
        );
        return { count: before - tables[model].length };
      },
      async aggregate(args: Args) {
        guard(model, "aggregate");
        const rows = tables[model].filter((row) => matches(row, args.where));
        const sums: Row = {};
        for (const field of Object.keys(args._sum ?? {})) {
          const values = rows.map((row) => row[field]).filter((v) => v != null);
          if (values.length === 0) {
            sums[field] = null;
          } else if (values.every((v) => typeof v === "number")) {
            sums[field] = (values as number[]).reduce((a, b) => a + b, 0);
          } else {
            sums[field] = values.reduce<Prisma.Decimal>(
              (total, v) => total.add(v as Prisma.Decimal.Value),
              new Prisma.Decimal(0),
            );
          }
        }
        return { _sum: sums };
      },
    };
  }

  const delegates = {
    organization: delegate("organization"),
    user: delegate("user"),
    matter: delegate("matter"),
    draft: delegate("draft"),
    timeEntry: delegate("timeEntry"),
  };

  const client = {
    ...delegates,

    /** Runs the callback and rolls every table back if it throws. */
    async $transaction<T>(
      callback: (tx: typeof delegates) => Promise<T>,
    ): Promise<T> {
      hooks.beforeTransaction?.();
      const snapshot = Object.fromEntries(
        MODELS.map((name) => [name, tables[name].map((row) => ({ ...row }))]),
      ) as Record<ModelName, Row[]>;
      try {
        return await callback(delegates);
      } catch (error) {
        for (const name of MODELS) tables[name] = snapshot[name];
        throw error;
      }
    },

    // ---- test helpers (not part of the Prisma API) ----
    $tables: tables,
    $hooks: hooks,
    $failOn(rule: FailureRule) {
      failures = [...failures, rule];
    },
    $reset() {
      for (const name of MODELS) tables[name] = [];
      callCounts.clear();
      failures = [];
      hooks.beforeTransaction = undefined;
    },
    $insert(model: ModelName, row: Row): Row {
      const full: Row = { ...DEFAULTS[model](), ...row };
      tables[model].push(full);
      return full;
    },
  };

  return client;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
