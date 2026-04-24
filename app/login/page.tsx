'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = {
  green: '#7ecf5f',
  greenDark: '#5ba33d',
  greenLight: '#e8f5e0',
  bg: '#fafff5',
  text: '#3d4a2e',
  textLight: '#6b7a55',
};

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }
      router.push('/');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.75rem',
    borderRadius: '8px',
    border: `1px solid ${COLORS.greenLight}`,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: COLORS.bg }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: '420px',
        background: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        border: `2px solid ${COLORS.greenLight}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: COLORS.greenDark, textAlign: 'center' }}>
          {isRegister ? '注册账号' : '登录'}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>用户名</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={2}
            autoFocus
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        {error && <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem',
            background: COLORS.green,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '处理中...' : isRegister ? '注册' : '登录'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: COLORS.textLight, margin: 0 }}>
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.greenDark,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'underline',
            }}
          >
            {isRegister ? '去登录' : '注册'}
          </button>
        </p>
      </form>
    </main>
  );
}
