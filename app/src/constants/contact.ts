export const supportEmailAddress = 'support@simplefasting.app';
export const supportRequestSubject = '[Simple Fasting] Support request';
export const bugReportSubject = '[Simple Fasting] Bug report';

export const createSupportMailto = (subject: string): string =>
  `mailto:${supportEmailAddress}?subject=${encodeURIComponent(subject)}`;
