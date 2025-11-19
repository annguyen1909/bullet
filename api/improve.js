import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from project root (one level up from this file)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// OpenAI SDK (optional; we fallback if no API key)
let OpenAIClient = null;
try {
  const mod = await import('openai');
  OpenAIClient = mod.default;
} catch (e) {
  // If not installed yet, dependency will be added by package.json install.
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend from project root
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

app.get('/', (_req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

// robots.txt and sitemap.xml with dynamic host
app.get('/robots.txt', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  res.type('application/xml').send(xml);
});

// Prompt template generator (style-specific, high-quality output)
function buildPrompt(bullet, style) {
  const general = `You are an expert resume editor.
Rewrite the resume bullet into 3 high‑quality variations that feel compelling and clear.

Language: write in the SAME language as the input (if mixed/unclear, default to English).
Tense & POV: past tense, no first‑person pronouns.
Tone: professional, confident, no hype.
Forbidden: “responsible for”, buzzwords, filler, emojis, quotes.
Formatting: each variation MUST be a single line. Output EXACTLY 3 lines. No headings/prefixes.

Core structure (adapt as needed):
Action verb + what + how + tools/tech + scope + outcome/impact + metric(s) + timeframe (if relevant)`;

  const byStyle = {
    'Impactful': `Style: Impactful
Emphasize outcome and scope. Prefer strong verbs (Led, Drove, Accelerated, Delivered, Orchestrated).
Use at least one concrete metric or scope indicator (users, revenue, latency, volume).` ,

    'Technical': `Style: Technical
Highlight architecture, stack, scale, performance. Include specific technologies (e.g., Node.js, React, AWS, Postgres), scale (RPS, data size), and perf numbers (p95, CPU, memory).
Prefer precise terms over generic words (service, microservice, pipeline, index, cache, shard, CDN).
Avoid marketing phrasing.`,

    'Metrics-Focused': `Style: Metrics‑Focused
Include at least TWO numeric metrics (percent, counts, timeframes) and a clear before/after or baseline (e.g., 180ms → 95ms; +32%; 1.2M users; 4 regions; 3 months).`,

    'Concise': `Style: Concise
Keep each variation ~12–18 words. Prioritize the most meaningful action + impact. Remove articles and filler. Still include ONE concrete metric.`,
  };

  const examples = {
    'Impactful': [
      'Orchestrated launch of analytics dashboard used by 1.2M users, speeding insights and trimming reporting time 45%.',
      'Led cross‑functional rollout of subscription flow, boosting conversions 23% and reducing support tickets 18%.',
      'Delivered caching strategy that cut page load times 38% and stabilized uptime to 99.95%.',
    ],
    'Technical': [
      'Engineered Node.js + Postgres microservice with Redis cache, handling 3k RPS; reduced p95 latency 120ms → 60ms.',
      'Designed S3 + CloudFront asset pipeline with checksum invalidation, slashing cold starts 55% and egress costs 28%.',
      'Implemented columnar analytics store (DuckDB/Parquet) enabling 10× faster cohort queries over 200M rows.',
    ],
    'Metrics-Focused': [
      'Increased trial‑to‑paid by 27% and reduced churn by 6 pts within 90 days via experiment‑driven onboarding.',
      'Cut p99 API latency 42% and error rate 65% by refactoring hot paths and introducing circuit breakers.',
      'Grew weekly active users 18% and referral sign‑ups 2.3× through shareable templates and in‑app prompts.',
    ],
    'Concise': [
      'Optimized checkout; +19% conversion, −35% errors in 6 weeks.',
      'Shipped autoscaling; p95 −40% at 3k RPS on AWS.',
      'Launched email nudge; +22% reactivation in 30 days.',
    ],
  };

  const styleBlock = byStyle[style] || byStyle['Impactful'];
  const ex = examples[style] || examples['Impactful'];

  return `${general}

${styleBlock}

Examples (${style}):
- ${ex[0]}
- ${ex[1]}
- ${ex[2]}

Bullet:
${bullet}

Return exactly 3 variations as 3 separate lines (no extra text).`;
}

// Fallback generator when no OPENAI_API_KEY present
function localFallback(bullet, style) {
  const base = bullet.replace(/[\s.]+$/g, '').trim();
  const metrics = [
    'in 6 months',
    'by 30%',
    'for 1.2M users',
    'cut costs 20%',
    'reduced p99 latency 35%'
  ];
  const actions = ['Led', 'Optimized', 'Engineered', 'Delivered', 'Spearheaded', 'Automated'];

  const toTech = (s) => s
    .replace(/team/gi, 'cross-functional team')
    .replace(/feature/gi, 'microservice')
    .replace(/app/gi, 'distributed system');

  const variations = [0,1,2].map((i) => {
    let v = `${actions[i % actions.length]} ${base}`;
    if (style === 'Technical') v = toTech(v);
    if (style === 'Concise') v = v.replace(/\b(the|a|an|to|for|that|which)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (style === 'Impactful') v += ' to drive measurable outcomes';
    if (style === 'Metrics-Focused') v += ` — ${metrics[i % metrics.length]}`;
    return v;
  });

  return variations;
}

async function callOpenAI(bullet, style) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !OpenAIClient) {
    if (!apiKey) console.warn('[bullet-improver] OPENAI_API_KEY not set; using local fallback');
    if (!OpenAIClient) console.warn('[bullet-improver] openai SDK unavailable; using local fallback');
    return localFallback(bullet, style);
  }

  const client = new OpenAIClient({ apiKey });
  const prompt = buildPrompt(bullet, style);

  const configuredModel = process.env.OPENAI_MODEL;
  const model = (!configuredModel || configuredModel === 'gpt-5') ? 'gpt-4o-mini' : configuredModel;
  const temperature = process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.7;

  const resp = await client.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: 'system', content: 'You are an expert resume editor.' },
      { role: 'user', content: prompt }
    ],
  });

  const content = resp?.choices?.[0]?.message?.content || '';
  let lines = content
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•\d.\)\s]+/, ''))
    .filter(Boolean);

  if (lines.length < 3) {
    const fallback = localFallback(bullet, style);
    lines = [...lines, ...fallback].slice(0, 3);
  } else if (lines.length > 3) {
    lines = lines.slice(0, 3);
  }

  return lines;
}

app.post('/api/improve', async (req, res) => {
  try {
    const { bullet, style } = req.body || {};
    if (!bullet || typeof bullet !== 'string') {
      return res.status(400).json({ error: 'Invalid "bullet". Provide a non-empty string.' });
    }
    const styles = ['Impactful', 'Technical', 'Metrics-Focused', 'Concise'];
    const selectedStyle = styles.includes(style) ? style : 'Impactful';

    const results = await callOpenAI(bullet, selectedStyle);
    return res.json({ results });
  } catch (err) {
    const msg = err?.message || 'Unexpected server error';
    return res.status(500).json({ error: msg });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Bullet Improver listening on http://localhost:${port}`);
});
