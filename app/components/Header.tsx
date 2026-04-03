'use client';

import { Layout, Button, Space } from 'antd';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import { LoginOutlined } from '@ant-design/icons';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { isSignedIn, isLoaded } = useUser();
  const { t } = useLanguage();

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div />

      <Space size="middle" align="center">
        <LanguageSwitcher />

        {!isLoaded ? (
          <div>{t('loading')}</div>
        ) : !isSignedIn ? (
          <SignInButton mode="modal">
            <Button type="primary" icon={<LoginOutlined />}>
              {t('login')}
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
      </Space>
    </AntHeader>
  );
}
