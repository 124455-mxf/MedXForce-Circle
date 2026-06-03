import { Bot, Globe, GraduationCap, Sparkles } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CircleTabPlaceholder } from './CircleTabPlaceholder';

export function CircleKnowScreen({ patient }: { patient: CirclePatientSummary }) {
  return (
    <CircleTabPlaceholder
      icon={Sparkles}
      iconClassName="bg-cyan-50 text-cyan-600"
      title="Know"
      patientName={patient.displayName}
      subtitle="Learning, community, and AI support — resources to help you care with confidence."
      items={[
        {
          icon: GraduationCap,
          title: 'Learning',
          description: 'Guided courses and articles (opens on medxforce.com when available).',
          badge: 'External',
        },
        {
          icon: Globe,
          title: 'Community',
          description: 'Web-based caregiver community (link coming soon).',
          badge: 'External',
        },
        {
          icon: Bot,
          title: 'MedisOn companion',
          description: 'AI assistant for questions about care, routines, and circle coordination.',
          badge: 'Planned',
        },
      ]}
    />
  );
}
