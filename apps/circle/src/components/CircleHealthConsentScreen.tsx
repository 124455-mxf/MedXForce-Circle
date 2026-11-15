import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { MedXForceBrandLogo } from './MedXForceBrandLogo';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@medxforce/shared';

type CircleTranslator = (path: string, params?: Record<string, unknown>) => string;

type CircleHealthConsentScreenProps = {
  t: CircleTranslator;
  showMember: boolean;
  showProxy: boolean;
  memberSentence: string;
  proxySentence: string;
  onAccept: () => Promise<void>;
  onSignOut: () => void;
};

export function CircleHealthConsentScreen({
  t,
  showMember,
  showProxy,
  memberSentence,
  proxySentence,
  onAccept,
  onSignOut,
}: CircleHealthConsentScreenProps) {
  const [memberAgreed, setMemberAgreed] = useState(false);
  const [proxyAgreed, setProxyAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ready = (!showMember || memberAgreed) && (!showProxy || proxyAgreed);

  return (
    <div className="min-h-dvh overflow-y-auto flex items-center justify-center p-4 bg-slate-100">
      <div className="bg-white p-6 rounded-[28px] shadow-xl max-w-md w-full space-y-5 border border-slate-100">
        <div className="flex justify-center">
          <MedXForceBrandLogo variant="large" className="w-44" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 text-center">{t('drawer.healthConsentTitle')}</h1>
        {showMember ? (
          <p className="text-sm text-slate-600 leading-relaxed">{t('drawer.healthConsentBody')}</p>
        ) : null}
        {showProxy && !showMember ? (
          <p className="text-sm text-slate-600 leading-relaxed">{t('drawer.healthConsentProxyIntro')}</p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"
          >
            {t('drawer.privacyPolicy')}
            <ExternalLink size={14} aria-hidden />
          </a>
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"
          >
            {t('drawer.terms')}
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>
        {showMember ? (
          <label className="flex items-start gap-3 text-left cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              checked={memberAgreed}
              disabled={saving}
              onChange={(event) => setMemberAgreed(event.target.checked)}
            />
            <span className="text-sm text-slate-800 leading-relaxed">{memberSentence}</span>
          </label>
        ) : null}
        {showProxy ? (
          <label className="flex items-start gap-3 text-left cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              checked={proxyAgreed}
              disabled={saving}
              onChange={(event) => setProxyAgreed(event.target.checked)}
            />
            <span className="text-sm text-slate-800 leading-relaxed">{proxySentence}</span>
          </label>
        ) : null}
        <p className="text-sm text-slate-500 leading-relaxed">{t('drawer.healthConsentWithdraw')}</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={!ready || saving}
          onClick={() => {
            setSaving(true);
            setError('');
            void onAccept().catch(() => {
              setSaving(false);
              setError(t('drawer.healthConsentFailed'));
            });
          }}
          className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? t('drawer.healthConsentSaving') : t('drawer.healthConsentContinue')}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          disabled={saving}
          className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
        >
          {t('drawer.signOut')}
        </button>
      </div>
    </div>
  );
}
