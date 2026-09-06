import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { renderOtpEmail } from './render';
import type { OtpEmailProps } from './OtpEmail';
function EmailFrame({ html, width = 560 }: { html: string; width?: number }) {
  return (
    <iframe
      title="PseudoStar sign-in email"
      sandbox=""
      srcDoc={html}
      style={{ width, maxWidth: '100%', height: 580, border: 0 }}
    />
  );
}
const meta = {
  title: 'Emails/Sign-in code',
  component: EmailFrame,
  args: { html: '' },
  argTypes: { html: { table: { disable: true }, control: false } },
  loaders: [
    async ({ args }) => ({
      email: await renderOtpEmail({
        code: '428163',
        expiresInMinutes: 10,
        ...args,
      } as OtpEmailProps),
    }),
  ],
  render: (args, { loaded }) => <EmailFrame html={loaded.email.html} width={args.width} />,
} satisfies Meta<typeof EmailFrame>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LeadingZero: Story = {
  loaders: [
    async () => ({ email: await renderOtpEmail({ code: '004219', expiresInMinutes: 10 }) }),
  ],
};
export const LongRecipient: Story = {
  loaders: [
    async () => ({
      email: await renderOtpEmail({
        code: '004219',
        expiresInMinutes: 10,
        recipientDisplay: 'a.learner.with.a.long.recipient.display@example-school.example',
      }),
    }),
  ],
};
export const Narrow: Story = { args: { width: 320 } };
