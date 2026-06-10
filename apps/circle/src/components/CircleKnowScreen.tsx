import { Bot, Globe, GraduationCap, Sparkles } from 'lucide-react';
import { CircleTabPlaceholder } from './CircleTabPlaceholder';

export function CircleKnowScreen() {
  return (
    <CircleTabPlaceholder
      icon={Sparkles}
      iconClassName="text-cyan-600"
      title="Know"
      badge="Coming soon"
      subtitle="Learning, community, and AI support — resources to help you care with confidence."
      items={[
        {
          icon: GraduationCap,
          iconClassName: 'text-blue-600',
          title: 'Learning',
          description: 'Guided courses and articles (opens on medxforce.com when available).',
          badge: 'External',
        },
        {
          icon: Globe,
          iconClassName: 'text-emerald-600',
          title: 'Community',
          description: 'Web-based caregiver community (link coming soon).',
          badge: 'External',
        },
        {
          icon: Bot,
          iconClassName: 'text-violet-600',
          title: 'MedisOn companion',
          description: 'AI assistant for questions about care, routines, and circle coordination.',
          badge: 'Planned',
        },
      ]}
    />
  );
}
