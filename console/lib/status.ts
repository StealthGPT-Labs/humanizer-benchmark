type Environment = Readonly<Record<string, string | undefined>>;

const HUMANIZERS = [
  { id: 'stealth', name: 'StealthGPT', envKey: 'STEALTHGPT_API_KEY' },
  { id: 'phrasly', name: 'Phrasly', envKey: 'PHRASLY_API_KEY' },
  { id: 'rephrasy', name: 'Rephrasy', envKey: 'REPHRASY_API_KEY' },
  { id: 'undetectableai', name: 'Undetectable.ai', envKey: 'UNDETECTABLE_API_KEY' },
  { id: 'hix', name: 'HIX Bypass', envKey: 'HIX_API_KEY' },
  { id: 'humbot', name: 'Humbot', envKey: 'HUMBOT_API_KEY' },
  { id: 'bypassgpt', name: 'BypassGPT', envKey: 'BYPASSGPT_API_KEY' },
  { id: 'writehuman', name: 'WriteHuman', envKey: 'WRITEHUMAN_API_KEY' },
  { id: 'grubby', name: 'Grubby', envKey: 'GRUBBY_API_KEY' },
  { id: 'rewriteai', name: 'RewriteAI', envKey: 'REWRITEAI_API_KEY' },
] as const;

const DETECTORS = [
  { id: 'pangram', name: 'Pangram', envKey: 'PANGRAM_API_KEY' },
  { id: 'gptzero', name: 'GPTZero', envKey: 'GPTZERO_API_KEY' },
  { id: 'originality', name: 'Originality.ai Turbo', envKey: 'ORIGINALITY_API_KEY' },
  { id: 'originality5', name: 'Originality.ai 5.0', envKey: 'ORIGINALITY_API_KEY' },
  { id: 'zerogpt', name: 'ZeroGPT', envKey: 'ZEROGPT_API_KEY' },
  { id: 'winston', name: 'Winston AI', envKey: 'WINSTON_API_KEY' },
] as const;

const SUPPORT_SERVICES = [
  { id: 'gateway', name: 'AI Gateway', envKey: 'AI_GATEWAY_API_KEY' },
  { id: 'openai', name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
] as const;

export function getConsoleStatus(env: Environment = process.env) {
  const configured = (key: string) => Boolean(env[key]?.trim());
  const humanizers = HUMANIZERS.map((provider) => ({ ...provider, configured: configured(provider.envKey) }));
  const detectors = DETECTORS.map((provider) => ({ ...provider, configured: configured(provider.envKey), weight: null }));
  const supportServices = SUPPORT_SERVICES.map((provider) => ({ ...provider, configured: configured(provider.envKey) }));
  const keys = new Set([...HUMANIZERS, ...DETECTORS, ...SUPPORT_SERVICES].map((provider) => provider.envKey));

  return {
    execution: {
      status: 'on_hold' as const,
      canRun: false as const,
      message: 'Waiting for your final benchmark instructions.',
    },
    referenceReport: { id: '2026-10-22-humanizer-comparison', label: 'October 22, 2026' },
    blockers: ['Choose the humanizer to add.', 'Define the detector-strength weights.', 'Finalize the remaining run instructions.'],
    humanizers,
    detectors,
    supportServices,
    qualityBenchmarks: [
      { name: 'Factual consistency', inspector: 'facts', description: 'Preserve numbers, citations, entities, and their relationships.' },
      { name: 'Naturalness', inspector: 'clunky', description: 'Check for broken or unnatural phrasing.' },
      { name: 'Syntax integrity', inspector: 'runon', description: 'Check for disruptive run-ons and clause chains.' },
      { name: 'Stance preservation', inspector: 'polarity', description: 'Preserve the source’s position and level of certainty.' },
    ],
    environment: { configuredCount: [...keys].filter(configured).length, totalCount: keys.size },
  };
}
