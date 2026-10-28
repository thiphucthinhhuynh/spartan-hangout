import { LIMITS } from '@sh/shared';
import { escapeHtml, type EmailMessage } from '../../common/email.js';

export function verificationEmail(to: string, displayName: string, link: string): EmailMessage {
  const hours = LIMITS.verificationLinkHours;
  return {
    to,
    subject: 'Verify your Spartan Hangout account',
    text: [
      `Hi ${displayName},`,
      '',
      'Welcome to Spartan Hangout! Confirm your SJSU email to activate your account:',
      link,
      '',
      `This link expires in ${hours} hours. If you didn't sign up, you can ignore this email.`,
    ].join('\n'),
    html: `<p>Hi ${escapeHtml(displayName)},</p>
<p>Welcome to Spartan Hangout! Confirm your SJSU email to activate your account:</p>
<p><a href="${escapeHtml(link)}">Verify my email</a></p>
<p>This link expires in ${hours} hours. If you didn't sign up, you can ignore this email.</p>`,
  };
}
