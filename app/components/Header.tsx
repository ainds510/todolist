'use client';

import { Layout, Button } from 'antd';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import { LoginOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <AntHeader
        style={{
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <div>加载中...</div>
      </AntHeader>
    );
  }

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button
            type="primary"
            icon={<LoginOutlined />}
          >
            登录
          </Button>
        </SignInButton>
      ) : (
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '40px',
                height: '40px',
              },
            },
          }}
        />
      )}
    </AntHeader>
  );
}
