import { BarChart3, ClipboardList } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CircleTabPlaceholder } from './CircleTabPlaceholder';

export function CircleAnalyticsScreen({ patient }: { patient: CirclePatientSummary }) {
  return (
    <CircleTabPlaceholder
      icon={BarChart3}
      iconClassName="bg-blue-50 text-blue-600"
      title="Analytics"
      patientName={patient.displayName}
      subtitle="Patient assessment data, trends, and clinical insights for proxies."
      items={[
        {
          icon: ClipboardList,
          title: 'Assessment overview',
          description: 'Scores, completion history, and changes over time.',
          badge: 'Planned',
        },
        {
          icon: BarChart3,
          title: 'Trends & reports',
          description: 'Charts and exports for care reviews and handoffs.',
          badge: 'Planned',
        },
      ]}
    />
  );
}
