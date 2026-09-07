import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AuthForm, type AuthFormProps } from './SignIn';
import '../style.css';
import '../app/production.css';

function ControlledForm(args: AuthFormProps) {
  const [email, setEmail] = useState(args.email),
    [code, setCode] = useState(args.code);
  return (
    <AuthForm
      {...args}
      email={email}
      code={code}
      onEmailChange={(value) => {
        setEmail(value);
        args.onEmailChange(value);
      }}
      onCodeChange={(value) => {
        setCode(value);
        args.onCodeChange(value);
      }}
    />
  );
}
const meta = {
  title: 'Auth/Sign in',
  component: AuthForm,
  parameters: { layout: 'fullscreen' },
  args: {
    email: 'learner@example.com',
    code: '',
    challenge: true,
    error: '',
    busy: false,
    cooldown: 0,
    onEmailChange: fn(),
    onCodeChange: fn(),
    onSubmit: fn(),
    onResend: fn(),
    onChangeEmail: fn(),
    onGuest: fn(),
  },
  render: (args) => <ControlledForm {...args} />,
} satisfies Meta<typeof AuthForm>;
export default meta;
type Story = StoryObj<typeof meta>;
function checked(play: NonNullable<Story['play']>): NonNullable<Story['play']> {
  return async (context) => {
    await play(context);
    context.canvasElement.dataset.authChecked = 'passed';
  };
}
export const CodeEntry: Story = {
  play: checked(async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Sign-in code'), '004219');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(args.onCodeChange).toHaveBeenLastCalledWith('004219');
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  }),
};
export const WrongCode: Story = {
  args: {
    code: '123456',
    error: 'This code is wrong, expired, or already used. Request a new code.',
  },
  play: checked(async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('This code is wrong');
    await userEvent.click(canvas.getByRole('button', { name: 'Send another code' }));
    await expect(args.onResend).toHaveBeenCalledOnce();
  }),
};
export const ExpiredCode: Story = {
  args: { error: 'This code is wrong, expired, or already used. Request a new code.' },
  play: checked(async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('expired');
    await userEvent.click(canvas.getByRole('button', { name: 'Use another email' }));
    await expect(args.onChangeEmail).toHaveBeenCalledOnce();
  }),
};
export const VerificationLoading: Story = {
  args: { busy: true, code: '004219' },
  play: checked(async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    await expect(canvas.getByLabelText('Sign-in code')).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Send another code' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Use another email' })).toBeDisabled();
  }),
};
export const SendFailed: Story = {
  args: { challenge: false, error: 'The email could not be sent. Try again later.' },
  play: checked(async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('could not be sent');
    await userEvent.click(canvas.getByRole('button', { name: 'Email me a code' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  }),
};
export const ResendCooldown: Story = {
  args: { cooldown: 42 },
  play: checked(async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const resend = canvas.getByRole('button', { name: 'Resend in 42s' });
    await expect(resend).toBeDisabled();
    await userEvent.click(resend);
    await expect(args.onResend).not.toHaveBeenCalled();
  }),
};
