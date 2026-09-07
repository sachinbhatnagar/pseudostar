import { describe, expect, it } from 'vitest';
import { renderOtpEmail } from '../../emails/render';
describe('OTP email', () => {
  it('renders HTML and text from the same real template', async () => {
    const email = await renderOtpEmail({ code: '004219', expiresInMinutes: 10 });
    for (const value of [email.html, email.text]) {
      expect(value).toContain('004219');
      expect(value).toContain('10 minutes');
      expect(value).toContain('PseudoStar');
      expect(value).toContain('ignore this email');
      expect(value).not.toContain('undefined');
    }
    expect(email.html).not.toContain('<script');
  });
  it('escapes recipient text', async () => {
    const email = await renderOtpEmail({
      code: '123456',
      expiresInMinutes: 10,
      recipientDisplay: '<script>alert(1)</script>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('<script>alert(1)</script>');
  });
  it('rejects numeric or malformed codes', async () => {
    await expect(renderOtpEmail({ code: '123', expiresInMinutes: 10 })).rejects.toThrow();
  });
});
