import { describe, expect, it } from "vitest";
import { knownAdvisory, validateAudit } from "../../scripts/audit-policy.mjs";

function fixture() {
  return {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { total: 1 } },
    vulnerabilities: {
      braces: { name: "braces", severity: "high", nodes: ["node_modules/braces"],
        via: [{ name: "braces", severity: "high", url: knownAdvisory }] },
    },
  };
}
const lock = { packages: { "node_modules/braces": { dev: true } } };

describe("dependency audit policy", () => {
  it("accepts a clean production and full audit", () => {
    const report = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} };
    expect(validateAudit(report, lock, true).total).toBe(0);
    expect(validateAudit(report, lock).total).toBe(0);
  });
  it("keeps the exact reviewed development advisory visible", () => {
    expect(validateAudit(fixture(), lock)).toEqual({ total: 1, accepted: ["braces"] });
  });
  it("rejects even the known advisory in the production audit", () => {
    expect(() => validateAudit(fixture(), lock, true)).toThrow("Production audit must have zero");
  });
  it("rejects a lockfile that moves the accepted package into runtime dependencies", () => {
    expect(() => validateAudit(fixture(), { packages: { "node_modules/braces": { dev: false } } })).toThrow("development-only");
  });
  it("rejects a new advisory on the accepted package", () => {
    const report = fixture();
    report.vulnerabilities.braces.via.push({ name: "braces", severity: "high", url: "https://github.com/advisories/GHSA-new-fixture" });
    expect(() => validateAudit(report, lock)).toThrow("Unexpected braces advisory");
  });
  it("rejects a severity escalation", () => {
    const report = fixture();
    report.vulnerabilities.braces.severity = "critical";
    expect(() => validateAudit(report, lock)).toThrow("development-only");
  });
  it("rejects a different finding in the lint chain", () => {
    const report = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 1 } },
      vulnerabilities: { "fast-glob": { name: "fast-glob", severity: "high", nodes: ["node_modules/fast-glob"], via: ["unexpected-package"] } } };
    expect(() => validateAudit(report, { packages: { "node_modules/fast-glob": { dev: true } } })).toThrow("Unexpected advisory");
  });
  it("fails on unavailable audit data or inconsistent counts", () => {
    expect(() => validateAudit({ error: { code: "E503" } }, lock)).toThrow("invalid");
    const report = fixture();
    report.metadata.vulnerabilities.total = 0;
    expect(() => validateAudit(report, lock)).toThrow("totals");
  });
});
