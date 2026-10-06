import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { profitQueries } from "../dashboard-stats";

// Builds the two profit queries against a driver-less client and reads the SQL
// they would send: no database needed, but it catches a malformed statement.
describe("profitQueries", () => {
  const client = drizzle.mock();
  const { salesQuery, costQuery } = profitQueries(client as never, new Date("2026-10-06T10:00:00Z"));

  it("counts only paid orders and cuts the months at Manila midnight", () => {
    const { sql, params } = salesQuery.toSQL();
    expect(sql).toContain('from "order"');
    expect(sql).toMatch(/"order"\."status" in \(\$\d+, \$\d+, \$\d+, \$\d+, \$\d+\)/);
    expect(sql).toContain("filter (where");
    expect(sql).toContain("::timestamp");
    expect(params).toEqual(
      expect.arrayContaining(["2026-09-30T16:00:00.000Z", "2026-08-31T16:00:00.000Z", "CONFIRMED", "COMPLETED"]),
    );
  });

  it("prices each sold item at its size's cost times the quantity", () => {
    const { sql } = costQuery.toSQL();
    expect(sql).toContain('sum("sku"."costPrice" * "order_item"."quantity")');
    expect(sql).toContain('inner join "order" on');
    expect(sql).toContain('inner join "sku" on');
  });
});
