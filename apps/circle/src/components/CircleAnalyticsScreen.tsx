import { BarChart3 } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';

export function CircleAnalyticsScreen({ patient }: { patient: CirclePatientSummary }) {
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 text-center space-y-4">
      <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
        <BarChart3 size={28} />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-lg">Analytics</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
          Insights for {patient.displayName} will appear here when available.
        </p>
      </div>
    </div>
  );
}
