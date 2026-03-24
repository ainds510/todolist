# Clerk 集成配置指南

## 已实施的安全功能

本项目已成功集成 Clerk 身份验证，并实现了以下安全功能：

### 1. ✅ Header 组件增强
- **组件位置**: `app/components/Header.tsx`
- **功能**:
  - 未登录用户: 显示蓝色"登录"按钮（带 LoginOutlined 图标）
  - 已登录用户: 显示 Clerk 官方 `UserButton` 组件（包含用户头像和下拉菜单）
  - 完全支持 Clerk 的登出功能
  - 界面风格与 Ant Design 完全统一

### 2. ✅ 页面保护 (Protected Pages)
- **实现方式**: 结合了两层保护
  1. **客户端检查** (`app/page.tsx`): 使用 `useUser()` 钩子检查登录状态
  2. **服务器层保护** (`middleware.ts`): 使用 `clerkMiddleware` 在请求级别保护所有受保护的路由
  
- **行为**:
  - 未登录用户访问首页时，自动重定向到 `/sign-in` 页面
  - 显示"正在重定向至登录页面..."提示信息
  - 登录成功后自动返回首页

### 3. ✅ 登录页面
- **路由**: `/sign-in`
- **组件**: `app/sign-in/page.tsx`
- **特点**:
  - 使用 Clerk 官方 `SignIn` 组件
  - Ant Design 风格的卡片布局
  - 响应式设计，适配所有设备

### 4. ✅ Clerk 环境配置
- **文件**: `.env.local`
- **已配置的环境变量**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: 公钥（在浏览器中安全使用）
  - `CLERK_SECRET_KEY`: 密钥（服务器端保密）
  - 其他 URL 配置

## 配置步骤

### 步骤 1: 创建 Clerk 账户
1. 访问 [Clerk Dashboard](https://dashboard.clerk.com)
2. 使用 GitHub、Google 或邮箱创建账户
3. 新建一个应用

### 步骤 2: 获取 API 密钥
1. 在 Clerk Dashboard 中进入你的应用
2. 找到左侧菜单的 "API Keys" 部分
3. 复制以下密钥:
   - **Publishable Key** (公钥)
   - **Secret Key** (密钥)

### 步骤 3: 配置环境变量
编辑 `.env.local` 文件，替换占位符：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx... # 替换为你的公钥
CLERK_SECRET_KEY=sk_test_xxxx...                  # 替换为你的密钥
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 步骤 4: 在 Clerk Dashboard 配置重定向 URI
1. 进入应用设置 → "URLs"
2. 添加以下允许的重定向 URI：
   - **开发环境**: `http://localhost:3000`
   - **生产环境**: `https://yourdomain.com`

### 步骤 5: 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000`，你应该会被重定向到登录页面。

## 代码架构说明

### 关键文件结构
```
app/
├── layout.tsx              # 根布局，集成 ClerkProvider
├── page.tsx               # 受保护的主页（任务列表）
├── components/
│   └── Header.tsx         # Header 组件（含登录/UserButton）
├── sign-in/
│   └── page.tsx           # Clerk 登录页面
├── globals.css            # 全局样式
└── page.css               # 页面样式

middleware.ts              # Clerk 路由保护中间件

.env.local                # 环境变量配置（包含 Clerk 密钥）
```

### 核心实现

#### 1. ClerkProvider 配置 (`layout.tsx`)
```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

#### 2. Header 组件 (`Header.tsx`)
- 使用 `useUser()` 获取登录状态
- 条件渲染登录按钮或 UserButton
- 集成 Ant Design Button 样式

#### 3. 页面保护 (`page.tsx`)
```typescript
const { isSignedIn, isLoaded } = useUser();

useEffect(() => {
  if (isLoaded && !isSignedIn) {
    router.push('/sign-in');
  }
}, [isLoaded, isSignedIn, router]);
```

#### 4. 中间件保护 (`middleware.ts`)
- 全局路由保护
- 排除 sign-in 等公开页面
- 服务器端验证

## 安全特性

✅ **CSRF 保护**: Clerk 自动处理 CSRF 防护  
✅ **会话管理**: 自动的 Session 令牌处理  
✅ **双层保护**: 客户端 + 服务器端验证  
✅ **自动登出**: UserButton 提供安全的登出功能  
✅ **环境变量隔离**: 密钥不暴露在客户端代码中  

## 样式定制

Clerk 组件已配置 Ant Design 风格：
- 主色: `#1890ff`（Ant Design 蓝色）
- 卡片布局: `borderRadius: 8px`
- 阴影效果: 与 Ant Design 对齐
- 响应式设计: 完全适配

## 后续开发

### 添加注册页面
如需启用用户注册，创建 `app/sign-up/page.tsx`：
```typescript
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return <SignUp />;
}
```

### 获取当前用户信息
在任何客户端组件中：
```typescript
const { user } = useUser();
console.log(user?.id, user?.primaryEmailAddress?.emailAddress);
```

### 保存用户数据
可将用户信息保存到数据库（需添加 API 路由）。

## 常见问题

**Q: 为什么我在开发环境看不到登录？**
A: 检查 `.env.local` 中的密钥是否正确配置。

**Q: 如何自定义登录/注册表单？**
A: 使用 Clerk 的 `appearance` API 进行定制，见本文档中的示例。

**Q: 如何在测试时跳过 Clerk 验证？**
A: Clerk 提供了测试模式，具体参考 [Clerk Testing Guide](https://clerk.com/docs/testing)。

## 相关文档

- [Clerk 官方文档](https://clerk.com/docs)
- [Clerk NextJS 集成](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk UserButton 组件](https://clerk.com/docs/components/organization/user-button)
- [Clerk 认证状态](https://clerk.com/docs/references/nextjs/use-user)

---

配置完成后，你的应用即可享受企业级的身份验证安全保护！
