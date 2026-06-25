import { User } from 'lucide-react';
import { cn } from '../lib/utils';

interface ContactCircleAvatarProps {
  photoUrl?: string;
  className?: string;
  iconSize?: number;
}

/** Circle member avatar from `circle_profiles`; generic user icon when no photo. */
export function ContactCircleAvatar({
  photoUrl,
  className,
  iconSize = 18,
}: ContactCircleAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden',
        className,
      )}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <User size={iconSize} className="text-slate-400" />
      )}
    </div>
  );
}
