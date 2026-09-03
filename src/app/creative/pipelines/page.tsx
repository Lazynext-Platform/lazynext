import Link from 'next/link';
import { Zap, ArrowRight, Film, Image, Video, Drama, Sparkles } from 'lucide-react';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

const PIPELINE_TEMPLATES = [
  {
    id: 'ugc-product-ad',
    name: 'UGC Product Ad',
    desc: 'Upload a product image → generate UGC-style ad with script, voiceover, and video',
    stages: ['Brief', 'Script', 'Storyboard', 'Media Generation', 'Audio', 'Edit', 'Publish'],
    icon: Film,
    credits: 15,
    href: '/creative-studio',
  },
  {
    id: 'reference-remix',
    name: 'Reference Remix',
    desc: 'Upload a reference ad → extract hooks and angles → generate a remix',
    stages: ['Reference Analysis', 'Creative Analysis', 'Remix Brief', 'Generation', 'Edit'],
    icon: Sparkles,
    credits: 4,
    href: '/reference-remix',
  },
  {
    id: 'drama-ad',
    name: 'Drama Ad',
    desc: 'Create AI drama ads with multi-scene scripts and shot generation',
    stages: ['Script', 'Shot Plan', 'Image Generation', 'Video', 'Audio', 'Edit'],
    icon: Drama,
    credits: 12,
    href: '/drama-studio',
  },
  {
    id: 'multi-concept',
    name: 'Multi-Concept Hook Engine',
    desc: 'Generate 6 concepts using distinct emotional triggers with A/B fork support',
    stages: ['Concept Generation', 'Evaluation', 'A/B Fork', 'Generation'],
    icon: Zap,
    credits: 6,
    href: '/multi-concept',
  },
];

export default async function PipelinesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  // Fetch user's pipeline runs (existing model)
  const pipelineRuns = await prisma.workflowRun.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Creative Pipelines</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {PIPELINE_TEMPLATES.length} templates · {pipelineRuns.length} recent run{pipelineRuns.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pipeline templates */}
      <h2 className="label-mono mb-3">Templates</h2>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {PIPELINE_TEMPLATES.map((tpl) => (
          <Link key={tpl.id} href={tpl.href}>
            <Card className="p-5 h-full transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="flex h-12 w-12 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-md)' }}
                >
                  <tpl.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{tpl.name}</h3>
                  <p className="text-sm text-fg-secondary mt-1">{tpl.desc}</p>
                </div>
                <Badge>{tpl.credits} credits</Badge>
              </div>
              {/* Pipeline stages */}
              <div className="flex items-center gap-1 flex-wrap pt-3 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
                {tpl.stages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-1">
                    <span
                      className="text-xs px-2 py-1 border font-mono"
                      style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                    >
                      {stage}
                    </span>
                    {i < tpl.stages.length - 1 && <ArrowRight className="h-3 w-3 text-fg-muted" />}
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent runs */}
      <h2 className="label-mono mb-3">Recent Runs</h2>
      {pipelineRuns.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Zap}
            title="No pipeline runs yet"
            description="Start a pipeline above to see your runs here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {pipelineRuns.map((run) => (
            <Card key={run.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Zap className="h-4 w-4 shrink-0 text-fg-muted" />
                <span className="text-sm font-medium truncate">{run.workflowType || run.id}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge>{run.status}</Badge>
                <span className="text-xs text-fg-muted">{new Date(run.startedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
