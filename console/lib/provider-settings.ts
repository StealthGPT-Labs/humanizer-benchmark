import profiles from './provider-settings.json';

export type ProviderConfiguration = {
  id: string;
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

export const modelPolicy = {
  summary: 'Use the strongest documented humanizer model with maximum humanization strength where supported.',
  rule: 'Confirm model access before execution. Record exact settings and returned model versions; never silently downgrade to a weaker model.',
  noSilentFallback: true as const,
  verifiedAccountCount: 0 as const,
  modeDecision: 'HIX uses the current v2 API with Aggressive mode to prioritize extensive rewriting. Its Latest mode is a separate alternative. Originality 5.0 Max is proposed in place of deprecated Turbo; the final detector panel and weights remain pending.',
};

export function getProviderConfiguration(id: string): ProviderConfiguration {
  const profile = profiles.find(profile => profile.id === id);
  if (!profile) throw new Error(`Missing provider configuration: ${id}`);
  return profile as ProviderConfiguration;
}
