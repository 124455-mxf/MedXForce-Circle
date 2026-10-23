import { Bot, Globe, GraduationCap, Sparkles } from 'lucide-react';
import { CircleTabPlaceholder } from './CircleTabPlaceholder';
import { useCircleT } from '../lib/circleI18nContext';

export function CircleKnowScreen() {
  const t = useCircleT();

  return (
    <CircleTabPlaceholder
      icon={Sparkles}
      iconClassName="text-cyan-600"
      title={t('know.title')}
      badge={t('know.comingSoon')}
      subtitle={t('know.subtitle')}
      items={[
        {
          icon: GraduationCap,
          iconClassName: 'text-blue-600',
          title: t('know.learningTitle'),
          description: t('know.learningDesc'),
          badge: t('know.badgeExternal'),
        },
        {
          icon: Globe,
          iconClassName: 'text-emerald-600',
          title: t('know.communityTitle'),
          description: t('know.communityDesc'),
          badge: t('know.badgeExternal'),
        },
        {
          icon: Bot,
          iconClassName: 'text-violet-600',
          title: t('know.medisOnTitle'),
          description: t('know.medisOnDesc'),
          badge: t('know.badgePlanned'),
        },
      ]}
    />
  );
}
