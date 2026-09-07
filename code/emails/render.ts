import { createElement } from 'react';
import { render, toPlainText } from 'react-email';
import { OtpEmail, type OtpEmailProps } from './OtpEmail';
export async function renderOtpEmail(
  props: OtpEmailProps,
): Promise<{ html: string; text: string }> {
  if (
    !/^\d{6}$/.test(props.code) ||
    !Number.isInteger(props.expiresInMinutes) ||
    props.expiresInMinutes < 1
  )
    throw new Error('Invalid email template input.');
  const html = await render(createElement(OtpEmail, props));
  return { html, text: toPlainText(html) };
}
