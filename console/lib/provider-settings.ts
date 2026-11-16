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
  summary: 'Use the provider-recommended setting for the best humanizing effect; otherwise use the most aggressive supported rewriting mode.',
  selectionPriority: 'vendor_recommended_effectiveness' as const,
  rule: 'Confirm the documented recommendation and model access before execution. Record exact settings and returned versions; never silently downgrade. Leave unranked choices flagged for confirmation.',
  noSilentFallback: true as const,
  verifiedAccountCount: 0 as const,
  modeDecision: 'HIX uses API v2 with Latest mode because its documentation recommends that technology for the most effective humanization. Phrasly is on hold until Ultra access arrives; Standard will not be substituted. Originality 5.0 Max remains proposed in place of deprecated Turbo, with the final panel and weights pending.',
};

export function getProviderConfiguration(id: string): ProviderConfiguration {
  const profile = profiles.find(profile => profile.id === id);
  if (!profile) throw new Error(`Missing provider configuration: ${id}`);
  return profile as ProviderConfiguration;
}
