// The only accepted finding is an unpatched development-only lint dependency.
// Keep the complete chain visible; any different advisory or runtime use fails.
export const knownAdvisory = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const lintChain = {
  'eslint-config-next': '@next/eslint-plugin-next',
  '@next/eslint-plugin-next': 'fast-glob',
  'fast-glob': 'micromatch',
  'micromatch': 'braces',
};

export function validateAudit(report, lockfile, production = false) {
  if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities ||
      typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities) || !lockfile?.packages) {
    throw new Error('Missing or invalid npm audit/lockfile data');
  }
  const findings = Object.entries(report.vulnerabilities);
  if (!Number.isInteger(report.metadata?.vulnerabilities?.total) ||
      report.metadata.vulnerabilities.total !== findings.length) {
    throw new Error('Audit totals do not match the finding list');
  }
  for (const [name, finding] of findings) {
    if (production) throw new Error('Production audit must have zero findings: ' + name);
    if (finding.name !== name || finding.severity !== 'high' ||
        !Array.isArray(finding.nodes) || finding.nodes.length === 0 ||
        !finding.nodes.every(node => node.startsWith('node_modules/') && lockfile.packages[node]?.dev === true)) {
      throw new Error('Finding is not the reviewed development-only exception: ' + name);
    }
    if (name === 'braces') {
      if (!Array.isArray(finding.via) || finding.via.length !== 1 ||
          finding.via[0].name !== 'braces' || finding.via[0].severity !== 'high' ||
          finding.via[0].url !== knownAdvisory) {
        throw new Error('Unexpected braces advisory');
      }
    } else if (!Object.hasOwn(lintChain, name) || !Array.isArray(finding.via) ||
        finding.via.length !== 1 || finding.via[0] !== lintChain[name] || !report.vulnerabilities[lintChain[name]]) {
      throw new Error('Unexpected advisory or dependency chain: ' + name);
    }
  }
  return { total: findings.length, accepted: findings.map(([name]) => name).sort() };
}
