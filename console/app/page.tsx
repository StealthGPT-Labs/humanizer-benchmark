import { headers } from 'next/headers';
import { authorizeOwner } from '@/lib/access';
import { getConsoleStatus } from '@/lib/status';

export const dynamic = 'force-dynamic';

const ENVIRONMENT_SETTINGS = 'https://vercel.com/focal-dev-ai/humanizer-benchmark/settings/environment-variables';
const PROTECTION_SETTINGS = 'https://vercel.com/focal-dev-ai/humanizer-benchmark/settings/deployment-protection';

function LockIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>;
}

function KeyStatus({ configured }: { configured: boolean }) {
  return <span className={`key-status ${configured ? 'present' : 'missing'}`}><span aria-hidden="true" />{configured ? 'Configured' : 'Not added'}</span>;
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
            <section className="surface" aria-labelledby="keys-title">
              <div className="section-heading"><div><h2 id="keys-title">API keys</h2><p>Import your <code>.env</code> file in Vercel, then redeploy to update this view.</p><a className="template-link" href="/api/env-template" download>Download the empty key template</a></div><a className="button primary" href={ENVIRONMENT_SETTINGS} target="_blank" rel="noreferrer">Open key settings</a></div>
              <div className="key-summary"><span>{status.environment.configuredCount} of {status.environment.totalCount} keys configured</span><span>Values stay on the server</span></div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Humanizer key configuration">
                <table className="provider-table">
                  <caption>Humanizers</caption>
                  <thead><tr><th scope="col">Provider</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.humanizers.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}</th><td><code>{provider.envKey}</code></td><td><KeyStatus configured={provider.configured} /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="roster-note"><span className="note-dot" aria-hidden="true" /><p>Ryne is excluded from the new run. The additional humanizer is still to be chosen.</p></div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Detector key configuration">
                <table className="provider-table">
                  <caption>AI detectors</caption>
                  <thead><tr><th scope="col">Provider</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.detectors.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}</th><td><code>{provider.envKey}</code></td><td><KeyStatus configured={provider.configured} /></td></tr>)}</tbody>
                </table>
              </div>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Support service key configuration">
                <table className="provider-table support-table">
                  <caption>Evaluation services</caption>
                  <thead><tr><th scope="col">Service</th><th scope="col">Environment key</th><th scope="col">Status</th></tr></thead>
                  <tbody>{status.supportServices.map((provider) => <tr key={provider.id}><th scope="row">{provider.name}</th><td><code>{provider.envKey}</code></td><td><KeyStatus configured={provider.configured} /></td></tr>)}</tbody>
                </table>
              </div>
              <p className="section-footnote">Configured means a value is present. Credentials have not been tested with the providers. Both Originality models use the same API key.</p>
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
              <dl className="run-details"><div><dt>Reference format</dt><dd>{status.referenceReport.label}</dd></div><div><dt>Humanizers</dt><dd>10 selected, 1 to choose</dd></div><div><dt>Detector models</dt><dd>6</dd></div><div><dt>Scoring weights</dt><dd>To be defined</dd></div></dl>
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
