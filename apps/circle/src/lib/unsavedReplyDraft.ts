export type UnsavedReplyDraftGuard = {
  hasUnsavedDraft: () => boolean;
  confirmNavigate: (proceed: () => void) => void;
  /** True when a message thread is open (not the inbox list). */
  isThreadOpen?: () => boolean;
  /** Return to the inbox list; respects unsaved reply draft. */
  popToInbox?: () => void;
};
