/**
 * Common disposable/temporary email domains.
 * Signups from these domains are blocked to prevent abuse.
 * Source: https://github.com/disposable-email-domains/disposable-email-domains
 * (trimmed to most common ones to keep bundle size small)
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'tempmail.org', '10minutemail.com',
  '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net',
  'throwawaymail.com', 'throwaway.email', 'fakeinbox.com', 'fakeinbox.net',
  'maildrop.cc', 'dispostable.com', 'mailnesia.com', 'tempinbox.com',
  'temp-mail.org', 'temp-mail.ru', 'yopmail.com', 'yopmail.net',
  'getnada.com', 'emailondeck.com', 'tempmailaddress.com', 'tmpmail.org',
  'tmpmail.net', 'sharklasers.com', 'guerrillamailblock.com', 'armyspy.com',
  'cuvox.de', 'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com',
  'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',
  'jetable.com', 'jetable.org', 'jetable.net', 'mailexpire.com',
  'kasmail.com', 'kaspop.com', 'bccto.com', 'chacuo.net', 'dcemail.com',
  'mohmal.com', 'mohmal.tech', 'moakt.com', 'moakt.ws', 'sowiip.com',
  'sowipmail.com', 'trashmail.com', 'trashmail.net', 'trashmail.me',
  'trashmail.io', 'mailcatch.com', 'mailnull.com', 'spamgourmet.com',
  'spamgourmet.net', 'spamgourmet.org', 'mintemail.com', 'mints.cf',
  'burnermail.io', 'burnermail.com', 'inboxbear.com', 'mytemp.email',
  'mytempemail.com', 'tempr.email', 'tempemail.com', 'tempemail.net',
  'discard.email', 'discardmail.com', 'discardmail.de', 'spambog.com',
  'spambog.ru', 'spambog.de', 'nospammail.net', 'antispammail.de',
  'mailtrash.net', 'mailtrash.com', 'spamfree.eu', 'spamfree.nl',
  'temprmail.com', 'temprmail.net', 'tmail.io', 'tmail.ws',
  '1secmail.com', '1secmail.org', '1secmail.net', 'email-fake.com',
  'emailfake.com', 'fake-mail.com', 'fakemail.com', 'fakemail.net',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
