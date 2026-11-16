import { authorizeOwner } from "@/lib/access";

export const dynamic = "force-dynamic";

const template = `# Import these API keys in Vercel Project Settings > Environment Variables.
# Select Production and store each credential as a Secret.
# The owner password is managed separately; do not overwrite it.

STEALTHGPT_API_KEY=
PHRASLY_API_KEY=
REPHRASY_API_KEY=
UNDETECTABLE_API_KEY=
HIX_API_KEY=
HUMBOT_API_KEY=
BYPASSGPT_API_KEY=
WRITEHUMAN_API_KEY=
GRUBBY_API_KEY=
REWRITEAI_API_KEY=
PANGRAM_API_KEY=
GPTZERO_API_KEY=
ORIGINALITY_API_KEY=
ZEROGPT_API_KEY=
WINSTON_API_KEY=
AI_GATEWAY_API_KEY=
OPENAI_API_KEY=
`;

export function GET(request: Request) {
  const denied = authorizeOwner(request.headers);
  if (denied) return denied;
  return new Response(template, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="benchmark.env.example"',
      "Cache-Control": "private, no-store",
    },
  });
}
