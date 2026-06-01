export type UnsavedReplyDraftGuard = {
  hasUnsavedDraft: () => boolean;
  confirmNavigate: (proceed: () => void) => void;
};
