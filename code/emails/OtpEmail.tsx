import * as React from 'react';
import { Heading, Text } from 'react-email';
import { EmailShell } from './EmailShell';
export interface OtpEmailProps {
  code: string;
  expiresInMinutes: number;
  recipientDisplay?: string;
}
export function OtpEmail({ code, expiresInMinutes, recipientDisplay }: OtpEmailProps) {
  return (
    <EmailShell>
      <Heading as="h1" style={{ fontSize: '26px', lineHeight: '34px' }}>
        Your sign-in code
      </Heading>
      {recipientDisplay && (
        <Text style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
          For {recipientDisplay}
        </Text>
      )}
      <Text>Use this code to sign in or create your PseudoStar account.</Text>
      <Text style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '5px', lineHeight: '44px' }}>
        {code}
      </Text>
      <Text>{`This code expires in ${expiresInMinutes} minutes. You can use it once.`}</Text>
      <Text>If you did not request this code, ignore this email. Do not share the code.</Text>
    </EmailShell>
  );
}
