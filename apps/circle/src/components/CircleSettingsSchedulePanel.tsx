import { Calendar } from 'lucide-react';
import {
  CIRCLE_SCHEDULE_DEFAULT_VIEW_OPTIONS,
  setCircleScheduleDefaultView,
  setCircleScheduleShowAppointmentDetails,
  type CircleScheduleDefaultView,
} from '../lib/circleSchedulePreferences';
import { useCircleScheduleDefaultView } from '../hooks/useCircleScheduleDefaultView';
import { useCircleScheduleShowAppointmentDetails } from '../hooks/useCircleScheduleShowAppointmentDetails';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';

const DEFAULT_VIEW_LABEL_KEYS: Record<CircleScheduleDefaultView, string> = {
  today: 'schedulePage.views.day',
  week: 'schedulePage.views.week',
  month: 'schedulePage.views.month',
};

export function CircleSettingsSchedulePanel() {
  const t = useCircleT();
  const showAppointmentDetails = useCircleScheduleShowAppointmentDetails();
  const defaultView = useCircleScheduleDefaultView();

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <Calendar size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">{t('settings.scheduleSettingsTitle')}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settings.scheduleSettingsSubtitle')}
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800">{t('settings.showAppointmentDetailsTitle')}</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('settings.showAppointmentDetailsDesc')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showAppointmentDetails}
            aria-label={t('settings.showAppointmentDetailsTitle')}
            onClick={() =>
              setCircleScheduleShowAppointmentDetails(!showAppointmentDetails)
            }
            className={cn(
              'w-14 h-8 rounded-full transition-all duration-300 relative shrink-0 mt-0.5',
              showAppointmentDetails ? 'bg-blue-600' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-0 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300',
                showAppointmentDetails ? 'translate-x-7' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">{t('settings.defaultScheduleViewTitle')}</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('settings.defaultScheduleViewDesc')}
          </p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5 flex-wrap"
          role="group"
          aria-label={t('settings.defaultScheduleViewTitle')}
        >
          {CIRCLE_SCHEDULE_DEFAULT_VIEW_OPTIONS.map((id) => {
            const active = defaultView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCircleScheduleDefaultView(id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {t(DEFAULT_VIEW_LABEL_KEYS[id])}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
