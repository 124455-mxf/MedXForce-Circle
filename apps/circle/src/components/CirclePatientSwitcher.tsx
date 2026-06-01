import { Check, ChevronDown, HeartHandshake, X } from 'lucide-react';
import { cn, type CirclePatientSummary } from '@medxforce/shared';

interface CirclePatientSwitcherProps {
  patients: CirclePatientSummary[];
  selected: CirclePatientSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: CirclePatientSummary) => void;
}

export function CirclePatientSwitcher({
  patients,
  selected,
  open,
  onOpenChange,
  onSelect,
}: CirclePatientSwitcherProps) {
  const selectedFromList =
    patients.find((p) => p.patientId === selected.patientId) ?? selected;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-3 min-w-0 w-full text-left px-2 py-1.5 rounded-xl hover:bg-white/70 transition-colors"
      >
        <div
          className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden"
          aria-hidden
        >
          {selectedFromList.photoUrl ? (
            <img src={selectedFromList.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <HeartHandshake size={20} className="text-blue-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caring for</p>
          <p className="font-bold text-slate-800 truncate">{selectedFromList.displayName}</p>
        </div>
        <ChevronDown size={18} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Switch patient</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
              {patients.map((patient) => {
                const isActive = patient.patientId === selected.patientId;
                return (
                  <li key={patient.patientId}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(patient);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent',
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden"
                        aria-hidden
                      >
                        {patient.photoUrl ? (
                          <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <HeartHandshake size={18} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{patient.displayName}</p>
                        <p className="text-xs text-slate-500 capitalize">{patient.role}</p>
                      </div>
                      {isActive && <Check size={20} className="text-blue-600 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
