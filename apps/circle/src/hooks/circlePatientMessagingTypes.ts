export type IcuSummaryEntry = {
  text: string;
  timestamp: number;
  source?: 'save' | 'speak';
};

export type CircleThreadMessage = {
  id: string;
  subject?: string;
  text: string;
  senderUid: string;
  senderName: string;
  status?: string;
  type?: string;
  circleMemberUids?: string[];
  recipientEmails?: string[];
  translations?: { language: string; text: string; subject?: string }[];
  createdAt: number;
  updatedAt: number;
  summaryEntries?: IcuSummaryEntry[];
};

export type CircleThreadReply = {
  id: string;
  patientId: string;
  messageId: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  isPatient: boolean;
  channel: 'app' | 'email';
  recipientEmails?: string[];
  circleMemberUids?: string[];
  translations?: { language: string; text: string; isAuto?: boolean }[];
  timestamp: number;
};
