import * as React from 'react';
import { Html, Head, Preview, Body, Container, Text } from 'react-email';
export function EmailShell({ children }: { children: React.ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your PseudoStar sign-in code.</Preview>
      <Body
        style={{
          backgroundColor: '#e4eee7',
          color: '#18392b',
          fontFamily: 'Arial, sans-serif',
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: '520px', padding: '32px 24px', margin: '0 auto' }}>
          <Text style={{ fontSize: '20px', fontWeight: 700 }}>PseudoStar</Text>
          {children}
          <Text style={{ fontSize: '14px', lineHeight: '22px' }}>
            Practise pseudocode. Build your own solution.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
