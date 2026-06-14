import { Gamepad2, ImagePlus, Mic, TestTube2, Video } from 'lucide-react';
import { CircleTabPlaceholder } from './CircleTabPlaceholder';
import { useCircleT } from '../lib/circleI18nContext';

export function CircleMedXForceLabScreen() {
  const t = useCircleT();

  return (
    <CircleTabPlaceholder
      icon={TestTube2}
      iconClassName="text-fuchsia-600"
      title={t('medxforceLab.title')}
      badge={t('medxforceLab.comingSoon')}
      subtitle={t('medxforceLab.subtitle')}
      items={[
        {
          icon: ImagePlus,
          iconClassName: 'text-violet-600',
          title: t('medxforceLab.aiPicturesTitle'),
          description: t('medxforceLab.aiPicturesDesc'),
          badge: t('medxforceLab.comingSoon'),
        },
        {
          icon: Mic,
          iconClassName: 'text-blue-600',
          title: t('medxforceLab.cloneVoiceTitle'),
          description: t('medxforceLab.cloneVoiceDesc'),
          badge: t('medxforceLab.comingSoon'),
        },
        {
          icon: Video,
          iconClassName: 'text-emerald-600',
          title: t('medxforceLab.videoAvatarTitle'),
          description: t('medxforceLab.videoAvatarDesc'),
          badge: t('medxforceLab.comingSoon'),
        },
        {
          icon: Gamepad2,
          iconClassName: 'text-amber-600',
          title: t('medxforceLab.createGamesTitle'),
          description: t('medxforceLab.createGamesDesc'),
          badge: t('medxforceLab.comingSoon'),
        },
      ]}
    />
  );
}
