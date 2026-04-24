'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = {
  green: '#7ecf5f',
  greenDark: '#5ba33d',
  greenLight: '#e8f5e0',
  yellow: '#f9d84d',
  yellowLight: '#fff9e0',
  red: '#e74c3c',
  redLight: '#fdecea',
  blue: '#5b9bd5',
  blueLight: '#e8f0fe',
  bg: '#fafff5',
  text: '#3d4a2e',
  textLight: '#6b7a55',
};

const RISK_COLORS: Record<string, { bg: string; border: string }> = {
  red: { bg: COLORS.redLight, border: COLORS.red },
  yellow: { bg: COLORS.yellowLight, border: COLORS.yellow },
  blue: { bg: COLORS.blueLight, border: COLORS.blue },
};

interface Snack {
  id: number;
  userId: number;
  name: string;
  riskLevel: string;
  riskLabel: string;
  interpretation: string;
  recordTime: string;
  username: string;
  ingredients: string[];
}

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) { router.replace('/login'); return; }
      return res.json();
    }).then(data => {
      if (data?.userId) setCurrentUserId(data.userId);
    });
  }, [router]);

  const fetchSnacks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/snacks?scope=${tab}`);
    if (res.ok) {
      setSnacks(await res.json());
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (currentUserId !== null) fetchSnacks();
  }, [currentUserId, fetchSnacks]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条记录吗？')) return;
    const res = await fetch(`/api/snacks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSnacks(prev => prev.filter(s => s.id !== id));
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    borderBottom: active ? `3px solid ${COLORS.green}` : '3px solid transparent',
    background: 'transparent',
    fontSize: '0.95rem',
    fontWeight: active ? 700 : 400,
    color: active ? COLORS.greenDark : COLORS.textLight,
    cursor: 'pointer',
  });

  return (
    <main style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark }}>食物库</h1>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: `1px solid ${COLORS.greenLight}`,
            borderRadius: '6px',
            padding: '0.3rem 0.75rem',
            fontSize: '0.8rem',
            color: COLORS.textLight,
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.greenLight}`, marginBottom: '1rem' }}>
        <button onClick={() => setTab('mine')} style={tabStyle(tab === 'mine')}>我的食物库</button>
        <button onClick={() => setTab('all')} style={tabStyle(tab === 'all')}>所有食物库</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}>加载中...</p>
      ) : snacks.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}>
          {tab === 'mine' ? '还没有记录，去首页添加一条吧' : '暂无记录'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {snacks.map(snack => {
            const riskColor = RISK_COLORS[snack.riskLevel] || RISK_COLORS.blue;
            const isOwner = snack.userId === currentUserId;

            return (
              <div key={snack.id} style={{
                background: '#fff',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                border: `1px solid ${COLORS.greenLight}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: COLORS.text }}>{snack.name}</span>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: riskColor.bg,
                        color: COLORS.text,
                        border: `1px solid ${riskColor.border}`,
                      }}>
                        {snack.riskLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: COLORS.textLight, marginBottom: '0.5rem' }}>
                      {snack.username} · {snack.recordTime}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(snack.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ccc',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '0.2rem 0.4rem',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                      onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                    >
                      删除
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {snack.ingredients.map((ing, i) => (
                    <span key={i} style={{
                      padding: '0.2rem 0.5rem',
                      background: COLORS.bg,
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      color: COLORS.text,
                      border: `1px solid ${COLORS.greenLight}`,
                    }}>
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
