import assert from 'node:assert/strict';

function client(baseUrl) {
  const url = new URL(baseUrl);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Verifier only supports loopback demos');
  const cookies = new Map();
  return async (route, init = {}) => {
    const headers = new Headers(init.headers);
    if (cookies.size) headers.set('cookie', [...cookies].map(([key, value]) => key + '=' + value).join('; '));
    const response = await fetch(new URL(route, url), { ...init, headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body, location: response.headers.get('location') };
  };
}
const json = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function login(request, email, password) {
  const csrf = await request('/api/auth/csrf');
  assert.equal(csrf.status, 200);
  const result = await request('/api/auth/callback/credentials', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
    body: new URLSearchParams({ csrfToken: csrf.body.csrfToken, email, password, callbackUrl: '/dashboard' }),
  });
  return { result, session: await request('/api/auth/session') };
}

export async function verifyWorkflow(baseUrl, password) {
  const steps = [];
  function checked(label, response, expected) { assert.equal(response.status, expected, label); steps.push({ label, status: response.status }); return response.body; }
  const anonymous = client(baseUrl);
  const denial = await anonymous('/api/entries');
  assert.ok(denial.status === 401 || ([302, 307].includes(denial.status) && new URL(denial.location, baseUrl).pathname === '/login'), 'Anonymous ledger access must be denied');
  steps.push({ label: 'Anonymous ledger access denied', status: denial.status });
  const invalid = await login(anonymous, 'demo.reviewer.a@example.com', password + '-wrong');
  assert.ok(!invalid.session.body?.user);
  assert.ok(new URL(invalid.result.body.url, baseUrl).searchParams.has('error'));
  steps.push({ label: 'Incorrect password does not create a session', status: invalid.session.status });

  const reviewerA = client(baseUrl), adminA = client(baseUrl), colleagueA = client(baseUrl), reviewerB = client(baseUrl);
  for (const [request, email] of [[reviewerA, 'demo.reviewer.a@example.com'], [adminA, 'demo.admin.a@example.com'], [colleagueA, 'demo.colleague.a@example.com'], [reviewerB, 'demo.reviewer.b@example.com']]) {
    const { session } = await login(request, email, password);
    assert.equal(session.body.user.email, email);
    assert.ok(session.body.user.organizationId);
    checked('Real credentials login: ' + email, session, 200);
  }
  const draftsA = checked('Reviewer A sees their three synthetic drafts', await reviewerA('/api/drafts'), 200).drafts;
  assert.equal(draftsA.length, 3);
  assert.ok(draftsA.every(draft => draft.user.email === 'demo.reviewer.a@example.com'));
  assert.equal(checked('Admin A sees all four firm A drafts', await adminA('/api/drafts'), 200).drafts.length, 4);
  assert.equal(checked('Colleague sees only their own draft', await colleagueA('/api/drafts'), 200).drafts.length, 1);
  const draftsB = checked('Reviewer B sees only firm B draft', await reviewerB('/api/drafts'), 200).drafts;
  assert.equal(draftsB.length, 1);
  const mattersA = checked('Active matter search excludes closed and firm B matters', await reviewerA('/api/matters/search'), 200).matters;
  assert.deepEqual(mattersA.map(matter => matter.matterNumber), ['DEMO-A-001']);
  const mattersB = checked('Firm B matter search is isolated', await reviewerB('/api/matters/search'), 200).matters;
  assert.deepEqual(mattersB.map(matter => matter.matterNumber), ['DEMO-B-001']);
  const review = draftsA.find(draft => draft.suggestedText.startsWith('Synthetic email:'));
  const concurrent = draftsA.find(draft => draft.suggestedText.includes('concurrent approval'));
  const failure = draftsA.find(draft => draft.suggestedText.includes('gateway failure'));
  checked('Unassigned draft cannot be approved', await reviewerA('/api/entries/approve', json('POST', { draftIds: [review.id] })), 400);
  checked('Cross-firm draft edit denied', await reviewerA('/api/drafts/bulk', json('PATCH', { draftIds: [draftsB[0].id], units: 5 })), 404);
  checked('Cross-firm matter assignment denied', await reviewerA('/api/drafts/bulk', json('PATCH', { draftIds: [review.id], matterId: mattersB[0].id })), 404);
  for (const units of [0, 2.5, 241]) checked('Reject invalid duration ' + units, await reviewerA('/api/drafts/bulk', json('PATCH', { draftIds: [review.id], units })), 400);
  const unchanged = checked('Rejected edits leave original duration and matter unchanged', await reviewerA('/api/drafts'), 200).drafts.find(draft => draft.id === review.id);
  assert.equal(unchanged.units, 2); assert.equal(unchanged.matterId, null);
  const narrative = 'Reviewed fictional lease terms; corrected the seeded activity narrative.';
  const patch = checked('Review saves matter, narrative and five duration units', await reviewerA('/api/drafts/bulk', json('PATCH', { draftIds: [review.id], matterId: mattersA[0].id, suggestedText: narrative, units: 5 })), 200);
  assert.equal(patch.drafts[0].units, 5);
  const approval = checked('Approval creates a ledger entry at R1750.00', await reviewerA('/api/entries/approve', json('POST', { draftIds: [review.id] })), 201).entries[0];
  assert.equal(Number(approval.totalValue), 1750);
  assert.equal(Number(approval.hourlyRateApplied), 3500);
  assert.equal(approval.units, 5);
  assert.equal(approval.finalizedText, narrative);
  checked('Duplicate approval is rejected', await reviewerA('/api/entries/approve', json('POST', { draftIds: [review.id] })), 404);
  const racing = await Promise.all([reviewerA('/api/entries/approve', json('POST', { draftIds: [concurrent.id] })), reviewerA('/api/entries/approve', json('POST', { draftIds: [concurrent.id] }))]);
  assert.equal(racing.filter(response => response.status === 201).length, 1);
  assert.ok(racing.some(response => [404, 409].includes(response.status)));
  steps.push({ label: 'Concurrent approval creates exactly one entry', statuses: racing.map(response => response.status) });
  const failureEntry = checked('Create an entry for simulated rejection', await reviewerA('/api/entries/approve', json('POST', { draftIds: [failure.id] })), 201).entries[0];
  const ledgerA = checked('Reviewer A ledger contains exactly three approved entries', await reviewerA('/api/entries'), 200).entries;
  assert.equal(ledgerA.length, 3);
  assert.equal(ledgerA.filter(entry => entry.finalizedText === concurrent.suggestedText).length, 1);
  assert.ok(ledgerA.every(entry => entry.user.email === 'demo.reviewer.a@example.com'));
  assert.equal(checked('Colleague ledger excludes another fee earner', await colleagueA('/api/entries'), 200).entries.length, 0);
  const ledgerB = checked('Firm B ledger contains only its pre-existing entry', await reviewerB('/api/entries'), 200).entries;
  assert.equal(ledgerB.length, 1);
  checked('Cannot synchronize another firm entry', await reviewerA('/api/sync/gateway', json('POST', { entryIds: [ledgerB[0].id] })), 409);
  const sync = checked('Simulated gateway locks the reviewed entry', await reviewerA('/api/sync/gateway', json('POST', { entryIds: [approval.id] })), 200);
  assert.equal(sync.synced, 1);
  assert.match(sync.message, /simulated/);
  checked('Repeat synchronization is rejected', await reviewerA('/api/sync/gateway', json('POST', { entryIds: [approval.id] })), 409);
  const syncedEntry = checked('Ledger reflects SYNCED and Locked', await reviewerA('/api/entries'), 200).entries.find(entry => entry.id === approval.id);
  assert.equal(syncedEntry.syncStatus, 'SYNCED'); assert.equal(syncedEntry.syncLock, true);
  const rounded = checked('Decimal half-cent rounds up for firm B', await reviewerB('/api/entries/approve', json('POST', { draftIds: [draftsB[0].id] })), 201).entries[0];
  assert.equal(Number(rounded.totalValue), 300.17);
  const dashboard = checked('Dashboard reflects approval hours and values', await reviewerA('/api/org/dashboard'), 200);
  assert.equal(dashboard.monthRealizedValue, 3150); assert.equal(dashboard.monthBillableHours, 0.9);
  assert.equal(checked('Admin ledger excludes firm B entries', await adminA('/api/entries'), 200).entries.length, 3);
  return { passed: steps.length, steps, failureEntryId: failureEntry.id, limits: ['Activity is synthetic seed data; no Microsoft Graph capture or AI generation', 'Gateway updates local records only; no external synchronization', 'Billing PDF generation and ERROR retry are not implemented', 'Organization boundaries tested; existing write APIs are organization-scoped rather than a complete per-role policy'] };
}

export async function verifyFailure(baseUrl, password, entryId) {
  const reviewer = client(baseUrl);
  const { session } = await login(reviewer, 'demo.reviewer.a@example.com', password);
  assert.equal(session.body.user.email, 'demo.reviewer.a@example.com');
  const response = await reviewer('/api/sync/gateway', json('POST', { entryIds: [entryId] }));
  assert.equal(response.status, 502); assert.match(response.body.error, /simulated/);
  const ledger = await reviewer('/api/entries');
  const rejected = ledger.body.entries.find(entry => entry.id === entryId);
  assert.equal(rejected.syncStatus, 'ERROR'); assert.equal(rejected.syncLock, false);
  const again = await reviewer('/api/sync/gateway', json('POST', { entryIds: [entryId] }));
  assert.equal(again.status, 409);
  return [{ label: 'Gateway rejection returns 502 and retains an unlocked ERROR entry', status: 502 }, { label: 'ERROR entry retry is explicitly unavailable', status: 409 }];
}
