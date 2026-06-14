import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  circleDeviceLocaleFromLocation,
  subscribeCirclePatientLocation,
  type CirclePatientLocationDoc,
} from '@medxforce/shared';

export function usePatientCircleLocation(
  db: Firestore,
  patientId: string | undefined,
): {
  location: CirclePatientLocationDoc | null;
  deviceLocale: ReturnType<typeof circleDeviceLocaleFromLocation>;
} {
  const [location, setLocation] = useState<CirclePatientLocationDoc | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLocation(null);
      return;
    }
    return subscribeCirclePatientLocation(db, patientId, setLocation);
  }, [db, patientId]);

  const deviceLocale = useMemo(() => circleDeviceLocaleFromLocation(location), [location]);

  return { location, deviceLocale };
}
