import { headers } from 'next/headers';
import { authorizeOwner } from '@/lib/access';
import { getConsoleStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

const ENVIRONMENT_SETTINGS = 'https://vercel.com/focal-dev-ai/humanizer-benchmark/settings/environment-variables';
const PROTECTION_SETTINGS = 'https://vercel.com/focal-dev-ai/humanizer-benchmark/settings/deployment-protection';

function LockIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>;
}

type KeyValidation = {
  status: 'verified' | 'credential_changed' | 'not_checked' | 'not_configured';
  checkedAt: string | null;
  method: string | null;
  endpoint: string | null;
  summary: string;
  evidence: 'reused_today' | 'live' | 'none';
  limitations: string[];
  modelAccess: 'not_checked' | 'confirmed' | 'unavailable' | 'on_hold' | 'model_mismatch';
  modelAccessMessage: string | null;
};

function KeyStatus({ configured, validation }: { configured: boolean; validation?: KeyValidation }) {
  const status = !configured ? 'missing' : validation?.status === 'verified' ? 'verified' : validation?.status === 'credential_changed' ? 'changed' : 'unchecked';
  const label = { missing: 'Not added', verified: 'Verified', changed: 'Needs recheck', unchecked: 'Present · not checked' }[status];
  return <span className={`key-status ${status}`}><span aria-hidden="true" />{label}</span>;
}

function KeyVerification({ validation }: { validation: KeyValidation }) {
  const evidenceLabel = { reused_today: 'Reused same-day check', live: 'Live check', none: 'No check recorded' }[validation.evidence];
  const checkedAt = validation.checkedAt ? new Date(validation.checkedAt) : null;
  const checkedLabel = checkedAt && !Number.isNaN(checkedAt.getTime())
    ? checkedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : null;

  return <div className="key-verification-record">
    <div className="verification-record-heading"><span>{evidenceLabel}</span>{checkedLabel ? <time dateTime={validation.checkedAt ?? undefined}>{checkedLabel}</time> : null}</div>
    <p>{validation.summary}</p>
    {validation.endpoint ? <p className="verification-endpoint"><code>{validation.method ?? 'Request'}</code><code>{validation.endpoint}</code></p> : null}
    {validation.limitations.length > 0 ? <ul>{validation.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul> : null}
  </div>;
}

function KeyTableStatus({ configured, validation }: { configured: boolean; validation: KeyValidation }) {
  return <><KeyStatus configured={configured} validation={validation} /><details className="key-check-details"><summary>Check details</summary><KeyVerification validation={validation} /></details></>;
}

type ProviderConfiguration = {
  modelLabel: string;
  strengthLabel: string;
  verificationStatus: 'documented' | 'partial' | 'needs_confirmation';
  endpoint: string | null;
  method: string | null;
  authScheme: string | null;
  requestExample: Record<string, unknown>;
  polling: string;
  versionRecording: string;
  limits: string[];
  notes: string[];
  blockers: string[];
  sources: { title: string; url: string }[];
  checkedDate: string;
  accountAccess: 'not_checked';
};

function ProviderProfile({ provider, compact = false }: {
  provider: { id: string; name: string; configured: boolean; configuration: ProviderConfiguration; keyValidation: KeyValidation; participation?: { status: 'planned' | 'on_hold' | 'blocked'; reason: string } };
  compact?: boolean;
}) {
  const config = provider.configuration;
  const validation = provider.keyValidation;
  const modelAccessLabel = { not_checked: 'Not checked', confirmed: 'Confirmed', unavailable: 'Unavailable', on_hold: 'On hold', model_mismatch: 'Model mismatch' }[validation.modelAccess];
  const documentationLabel = {
    documented: 'Documented',
    partial: 'Partly documented',
    needs_confirmation: 'Needs confirmation',
  }[config.verificationStatus];

  return (
    <details className={`provider-profile${compact ? ' compact-profile' : ''}`}>
      <summary>
        <span className="profile-summary-top"><span className="profile-name"><span className="profile-chevron" aria-hidden="true" />{provider.name}{provider.participation && provider.participation.status !== 'planned' ? <span className={`participation-badge ${provider.participation.status}`}>{provider.participation.status === 'blocked' ? 'Blocked' : 'On hold'}</span> : null}</span><span className={`documentation-status ${config.verificationStatus}`}>{documentationLabel}</span></span>
        <span className="profile-summary-settings"><span><small>Model</small><span>{config.modelLabel}</span></span><span><small>Strength / mode</small><span>{config.strengthLabel}</span></span></span>
      </summary>
      <div className="profile-content">
        <div className="profile-verification"><span className={`model-access-state ${validation.modelAccess}`}>Requested model access: {modelAccessLabel}</span><span>Key: <KeyStatus configured={provider.configured} validation={validation} /></span></div>
        {validation.modelAccessMessage ? <p className={`model-access-message ${validation.modelAccess}`}>{validation.modelAccessMessage}</p> : null}
        <div className="profile-key-verification"><h3>Key verification</h3><KeyVerification validation={validation} /></div>
        {provider.participation && provider.participation.status !== 'planned' ? <div className={`participation-reason ${provider.participation.status}`}><strong>{provider.participation.status === 'blocked' ? 'Participation blocked' : 'Participation on hold'}</strong><p>{provider.participation.reason}</p></div> : null}
        <div className="request-heading">Request settings</div>
        <div className="request-endpoint"><code className="request-method">{config.method ?? 'To confirm'}</code><code>{config.endpoint ?? 'Endpoint needs confirmation'}</code></div>
        <p className="request-auth"><span>Authentication</span><code>{config.authScheme ?? 'Authentication scheme needs confirmation'}</code></p>
        <pre className="request-example" tabIndex={0} aria-label={`${provider.name} public request settings`}><code>{JSON.stringify(config.requestExample, null, 2)}</code></pre>
        <dl className="profile-facts"><div><dt>Completion / polling</dt><dd>{config.polling}</dd></div><div><dt>Version recording</dt><dd>{config.versionRecording}</dd></div></dl>
        {config.limits.length > 0 ? <div className="profile-notes"><h3>Limits</h3><ul>{config.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul></div> : null}
        {config.notes.length > 0 ? <div className="profile-notes"><h3>Notes</h3><ul>{config.notes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}
        {config.blockers.length > 0 ? <div className="profile-blockers"><h3>Still to resolve</h3><ul>{config.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
        <div className="profile-sources"><div><span>Documentation checked</span><time dateTime={config.checkedDate}>{config.checkedDate}</time></div>{config.sources.length > 0 ? <ul>{config.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul> : <p>Official documentation still needs confirmation.</p>}</div>
      </div>
    </details>
  );
}

export default async function Page() {
  const denied = authorizeOwner(await headers());
  if (denied) {
    return <main className="access-denied"><LockIcon size={28} /><h1>Private workspace</h1><p>Owner credentials are required to open this console.</p></main>;
  }
  const status = getConsoleStatus();

  return (
    <>
      <a className="skip-link" href="#main">Skip to setup</a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Humanizer Benchmark home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Humanizer Benchmark</span></a>
          <span className="private-label"><LockIcon />Private workspace</span>
        </div>
      </header>

      <main id="main" className="workspace">
        <div className="page-title">
          <div><h1>Prepare the next comparison</h1><p>One workspace for your keys, evaluation checks, and run setup.</p></div>
          <a className="text-link" href="https://github.com/StealthGPT-Labs/humanizer-benchmark" target="_blank" rel="noreferrer">View benchmark repository</a>
        </div>

        <section className="hold-notice" aria-labelledby="hold-title">
          <div className="pause-symbol" aria-hidden="true"><i /><i /></div>
          <div><h2 id="hold-title">Benchmark execution is on hold</h2><p>You can prepare the keys now. No benchmark has started, and this console cannot launch a run.</p></div>
          <span className="hold-badge">Awaiting instructions</span>
        </section>

        <div className="workspace-grid">
          <div className="main-column">
            <section className="surface model-section" aria-labelledby="models-title">
              <div className="section-heading"><div><h2 id="models-title">Models and humanization strength</h2><p>Requested settings from provider documentation. Key checks and requested-model access are recorded separately. Execution remains locked.</p></div></div>
              <div className="model-policy"><p>{status.modelPolicy.summary}</p><p><strong>Selection rule</strong> {status.modelPolicy.rule}</p><p className="mode-decision">{status.modelPolicy.modeDecision}</p><span>{status.modelPolicy.verifiedAccountCount} requested model checks verified. No silent model fallback.</span></div>
              {status.humanizers.some((provider) => provider.id === 'phrasly' && provider.participation.status === 'on_hold') ? <div className="participation-notice"><span className="participation-badge">Phrasly on hold</span><p>Phrasly will be skipped until Ultra access is enabled. Standard will not be used as a fallback.</p></div> : null}
              {status.humanizers.some((provider) => provider.id === 'writehuman' && provider.participation.status === 'blocked') ? <div className="participation-notice blocked"><span className="participation-badge blocked">WriteHuman blocked</span><p>WriteHuman Enhanced requires Premium access. It will be skipped until that access is available, with no Standard fallback.</p></div> : null}
              <div className="provider-profiles">{status.humanizers.map((provider) => <ProviderProfile key={provider.id} provider={provider} />)}</div>
              <p className="section-footnote">Open a provider to review its key check, requested-model access, request settings, and source documentation. A verified key does not establish access to the requested model.</p>
            </section>

            <section className="surface" aria-labelledby="keys-title">
              <div className="section-heading"><div><h2 id="keys-title">API keys</h2><p>Import your <code>.env</code> file in Vercel, then redeploy to update this view.</p><a className="template-link" href="/api/env-template" download>Download the empty key template</a></div><a className="button primary" href={ENVIRONMENT_SETTINGS} target="_blank" rel="noreferrer">Open key settings</a></div>
              <div className="key-summary"><span>{status.environment.configuredCount} of {status.environment.totalCount} keys present; {status.environment.verifiedCount} verified</span><span>Values stay on the server</span></div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Humanizer key configuration">
                <table className="provider-table">
                  <caption>Humanizers</caption>
                  <thead><tr><th scope="col">Provider</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.humanizers.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}{provider.participation.status !== 'planned' ? <small className={`table-participation ${provider.participation.status}`}>{provider.participation.status === 'blocked' ? 'Blocked' : 'On hold'}: {provider.participation.reason}</small> : null}</th><td><code>{provider.envKey}</code></td><td><KeyTableStatus configured={provider.configured} validation={provider.keyValidation} /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="roster-note"><span className="note-dot" aria-hidden="true" /><p>Ryne is excluded from the new run. Four additional humanizers will be run manually; their outputs will be included in evaluation.</p></div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Detector key configuration">
                <table className="provider-table">
                  <caption>AI detectors</caption>
                  <thead><tr><th scope="col">Provider</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.detectors.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}</th><td><code>{provider.envKey}</code></td><td><KeyTableStatus configured={provider.configured} validation={provider.keyValidation} /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Support service key configuration">
                <table className="provider-table support-table">
                  <caption>Evaluation services</caption>
                  <thead><tr><th scope="col">Service</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.supportServices.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}</th><td><code>{provider.envKey}</code></td><td><KeyTableStatus configured={provider.configured} validation={provider.keyValidation} /></td></tr>)}</tbody>
                </table>
              </div>
              <p className="section-footnote">Present means a value is configured. Verified means the current key has a successful recorded check; open Check details for its scope and limitations. Originality uses only the 5.0 detector.</p>
            </section>

            <section className="surface detector-profile-section" aria-labelledby="detector-models-title">
              <div className="section-heading"><div><h2 id="detector-models-title">Detector model settings</h2><p>Review the requested model and version handling for each detector.</p></div></div>
              <div className="provider-profiles">{status.detectors.map((provider) => <ProviderProfile key={provider.id} provider={provider} compact />)}</div>
              <p className="section-footnote">Model access is recorded separately for each detector. Originality uses 5.0 only.</p>
            </section>

            <section className="surface quality-section" aria-labelledby="quality-title">
              <div className="section-heading"><div><h2 id="quality-title">Writing quality checks</h2><p>The four dimensions used in the October 22 comparison.</p></div><span className="quiet-badge">Mapped</span></div>
              <dl className="quality-list">{status.qualityBenchmarks.map((benchmark) => <div key={benchmark.inspector}><dt>{benchmark.name}</dt><dd>{benchmark.description}</dd></div>)}</dl>
              <p className="section-footnote">Checks assess the delivered output. Quality results remain separate from detector scores.</p>
            </section>
          </div>

          <aside className="setup-sidebar" aria-label="Run preparation">
            <section className="run-sheet" aria-labelledby="run-title">
              <h2 id="run-title">Next run</h2>
              <p className="sheet-intro">Setup is open. Execution stays locked until your final instructions are complete.</p>
              <dl className="run-details"><div><dt>Reference format</dt><dd>{status.referenceReport.label}</dd></div><div><dt>Humanizers</dt><dd>{status.roster.plannedHumanizers} planned, {status.roster.onHoldHumanizers} on hold<br />{status.roster.blockedHumanizers} blocked, 4 manual</dd></div><div><dt>Detector models</dt><dd>{status.detectors.length}</dd></div><div><dt>Scoring weights</dt><dd>To be defined</dd></div></dl>
              <div className="pending-heading">Before execution</div>
              <ul className="pending-list">{status.blockers.map((blocker) => <li key={blocker}><span aria-hidden="true" />{blocker}</li>)}</ul>
              <button className="button run-button" disabled><LockIcon />Run benchmark</button>
              <p className="button-note">No runs are scheduled.</p>
            </section>

            <section className="sidebar-section" aria-labelledby="weights-title">
              <h2 id="weights-title">Detector weighting</h2><p>Strength-based weights will be fixed before results are collected.</p>
              <dl className="weight-list">{status.detectors.map((detector) => <div key={detector.id}><dt>{detector.name}</dt><dd>Pending</dd></div>)}</dl>
            </section>

            <section className="sidebar-section privacy-section" aria-labelledby="privacy-title">
              <h2 id="privacy-title"><LockIcon />Owner access</h2><p>This console requires your private owner password. API keys are never displayed or sent to the browser.</p><a className="text-link" href={PROTECTION_SETTINGS} target="_blank" rel="noreferrer">Review Vercel protection</a>
            </section>
          </aside>
        </div>

        <footer className="workspace-footer"><span>Humanizer Benchmark</span><span>Private setup, no benchmark running</span></footer>
      </main>
    </>
  );
}
