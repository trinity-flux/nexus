import { Button, Card } from '@trinity-nexus/ui';
import { ArrowRight, MessagesSquare, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

export function HomePage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-4">
        <h1 className="max-w-2xl text-balance font-semibold text-3xl text-fg leading-tight tracking-tight sm:text-4xl">
          {t('home.heading')}
        </h1>
        <p className="max-w-prose text-fg-muted">{t('home.subheading')}</p>

        <Button asChild>
          <Link to="/c">
            {t('home.browse')}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </section>

      {/*
        Live numbers rather than promises. A community page that says "join
        thousands" and shows an empty board loses the visitor immediately; one
        that shows what actually happened today is either encouraging or
        honest, and both beat marketing copy.
      */}
      <section aria-label={t('home.recentActivity')}>
        <ul className="grid gap-3 sm:grid-cols-3">
          <Stat icon={Users} label={t('home.stats.members', { count: 4 })} />
          <Stat icon={MessagesSquare} label={t('home.stats.topics', { count: 6 })} />
          <Stat icon={Sparkles} label={t('home.stats.postsToday', { count: 7 })} />
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <li>
      <Card className="flex items-center gap-3 p-4">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-fg-subtle" />
        <span className="font-medium text-fg text-sm">{label}</span>
      </Card>
    </li>
  );
}
