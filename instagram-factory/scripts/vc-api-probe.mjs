// Read-only probe of the vc.ru (Osnova) API.
//
// The question this answers: can the factory create a vc.ru draft by itself, the way it already
// creates Instagram posts through Metricool? Nothing here writes: it never POSTs an entry, never
// uploads, never publishes. It reports what the API allows so the decision is made on facts
// rather than on what the documentation used to say.
//
// A token is optional. Without one the probe still reports whether the API answers at all and
// which entry-creating endpoints its schema declares; with VC_RU_TOKEN it also confirms the
// token is accepted and names the account it belongs to.

const TOKEN = process.env.VC_RU_TOKEN || '';
const TIMEOUT_MS = 15000;

const HOSTS = ['https://api.vc.ru', 'https://api.dtf.ru'];
const VERSIONS = ['v2.31', 'v2.1', 'v1.9'];
const SCHEMAS = [
  'https://cmtt-ru.github.io/osnova-api/v2.0/api.yaml',
  'https://cmtt-ru.github.io/osnova-api/swaggerui/openapi.yaml',
  'https://raw.githubusercontent.com/cmtt-ru/osnova-api/master/v2.0/api.yaml'
];

async function attempt(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      body: body.slice(0, 4000)
    };
  } catch (error) {
    return { ok: false, status: null, error: error.name === 'AbortError' ? 'timeout' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

const authHeaders = TOKEN
  ? { 'X-Device-Token': TOKEN, Accept: 'application/json', 'User-Agent': 'alexsmoley-content-factory/1.0' }
  : { Accept: 'application/json', 'User-Agent': 'alexsmoley-content-factory/1.0' };

const report = {
  probedAt: new Date().toISOString(),
  tokenProvided: Boolean(TOKEN),
  reachability: [],
  authenticated: null,
  entryEndpoints: [],
  draftSupport: 'unknown',
  conclusion: ''
};

// 1. Does the API answer at all, and on which version prefix?
for (const host of HOSTS) {
  for (const version of VERSIONS) {
    const url = `${host}/${version}/subsite/me`;
    const result = await attempt(url, { headers: authHeaders });
    // A status code alone does not prove the API answered: an egress proxy in front of the
    // runner returns its own 403 to a blocked host, which is indistinguishable from a real
    // refusal unless the body is checked. Osnova answers JSON even when it rejects you, so a
    // JSON body is what separates "the API said no" from "something else said no".
    const looksLikeApi = /json/iu.test(result.contentType || '')
      || /^\s*[{[]/u.test(result.body || '');
    report.reachability.push({
      url,
      status: result.status,
      contentType: result.contentType ?? null,
      error: result.error ?? null,
      // 401/403 from the API itself is a useful answer: the endpoint exists and wants credentials.
      answers: result.status !== null && looksLikeApi,
      blockedByIntermediary: result.status !== null && !looksLikeApi
    });
    if (TOKEN && result.ok && !report.authenticated) {
      let account = null;
      try {
        const parsed = JSON.parse(result.body);
        account = parsed?.result?.name ?? parsed?.result?.id ?? null;
      } catch { /* the body was not the JSON shape we expected; the status is what matters */ }
      report.authenticated = { url, account };
    }
  }
}

// 2. What does the published schema say about creating an entry, and about drafts?
for (const schemaUrl of SCHEMAS) {
  const result = await attempt(schemaUrl);
  if (!result.ok) continue;
  const text = result.body;
  for (const match of text.matchAll(/^\s{2}(\/[A-Za-z0-9_\/{}.-]*entry[A-Za-z0-9_\/{}.-]*):/gmu)) {
    report.entryEndpoints.push({ schema: schemaUrl, path: match[1] });
  }
  if (/isDraft|is_draft|draft/iu.test(text)) report.draftSupport = 'schema mentions drafts';
  break;
}

const answering = report.reachability.filter((row) => row.answers);
const intercepted = report.reachability.filter((row) => row.blockedByIntermediary);
if (answering.length === 0 && intercepted.length > 0) {
  report.conclusion = `Every request was answered by something that is not the API (${intercepted.length} of ${report.reachability.length} returned a non-JSON body). This runner cannot reach vc.ru, so the probe proves nothing about the API itself.`;
} else if (answering.length === 0) {
  report.conclusion = 'The API did not answer from this runner. Automated drafting through the API is not available; use the local browser route instead.';
} else if (TOKEN && !report.authenticated) {
  report.conclusion = 'The API answers but the token was refused. Check that VC_RU_TOKEN is a current X-Device-Token for the author account.';
} else if (TOKEN && report.authenticated) {
  report.conclusion = 'The API answers and the token works. Next step: confirm the entry-creating endpoint and its draft flag before writing the draft step.';
} else {
  report.conclusion = 'The API answers. Add VC_RU_TOKEN as a repository secret and run again to confirm the token path.';
}

const rendered = JSON.stringify(report, null, 2);
console.log(rendered);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## vc.ru API probe\n\n${report.conclusion}\n\n\`\`\`json\n${rendered}\n\`\`\`\n`);
}
const { mkdirSync, writeFileSync } = await import('node:fs');
mkdirSync('output/vc', { recursive: true });
writeFileSync('output/vc/api-probe.json', `${rendered}\n`);
