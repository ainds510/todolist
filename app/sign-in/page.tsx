'use client';

import { SignIn } from '@clerk/nextjs';
import { Layout } from 'antd';

export default function SignInPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <SignIn
            appearance={{
              elements: {
                rootBox: {
                  margin: '0 auto',
                },
                card: {
                  boxShadow: 'none',
                  background: 'transparent',
                },
                headerTitle: {
                  fontSize: '24px',
                  fontWeight: 600,
                  marginBottom: '24px',
                  color: '#000',
                },
                formButtonPrimary: {
                  background: '#1890ff',
                  '&:hover': {
                    background: '#40a9ff',
                  },
                },
                dividerLine: {
                  background: '#d9d9d9',
                },
                dividerText: {
                  color: '#8c8c8c',
                },
              },
            }}
          />
        </div>
      </div>
    </Layout>
  );
}
