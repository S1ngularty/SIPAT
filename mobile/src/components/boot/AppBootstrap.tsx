import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/expo';

import { useSpeech } from '../../modules/speech-recognition';
import { BootSplash } from './BootSplash';

/** Keep the completed status visible for a beat so it does not flash. */
const READY_HOLD_MS = 450;

type Props = {
  children: React.ReactNode;
};

/**
 * Blocks the navigator until the speech model has been checked/prepared.
 * While that runs, the branded splash owns the screen.
 */
export const AppBootstrap: React.FC<Props> = ({ children }) => {
  const { status, progress, error, retry, skip } = useSpeech();
  const { isLoaded } = useAuth();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (status !== 'ready' && status !== 'skipped') return;
    // Keep the splash up until Clerk has restored the session as well.
    if (!isLoaded) return;

    const delay = status === 'ready' ? READY_HOLD_MS : 0;

    const timer = setTimeout(() => setRevealed(true), delay);

    return () => clearTimeout(timer);
  }, [isLoaded, status]);

  if (!revealed) {
    return (
      <BootSplash
        status={status}
        progress={progress}
        error={error}
        onRetry={retry}
        onSkip={skip}
      />
    );
  }

  return <>{children}</>;
};
