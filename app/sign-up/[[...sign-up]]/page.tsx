'use client';

import { SignUp } from '@clerk/nextjs';
import { Layout, Typography, Space } from 'antd';
import Header from '../../components/Header';
import { useLanguage } from '../../components/LanguageProvider';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function SignUpPage() {
  const { t } = useLanguage();

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header />

      <Content
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '960px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <Space direction="vertical" size="small">
            <Title level={1} style={{ marginBottom: 0 }}>
              {t('signUpTitle')}
            </Title>
            <Paragraph style={{ marginBottom: 0, fontSize: '16px', color: '#595959' }}>
              {t('signUpSubtitle')}
            </Paragraph>
          </Space>

          <div
            style={{
              background: '#fff',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <SignUp
              appearance={{
                elements: {
                  rootBox: {
                    margin: '0 auto',
                    width: '100%',
                  },
                  card: {
                    boxShadow: 'none',
                    background: 'transparent',
                    width: '100%',
                  },
                  headerTitle: {
                    display: 'none',
                  },
                  headerSubtitle: {
                    display: 'none',
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
      </Content>
    </Layout>
  );
}
