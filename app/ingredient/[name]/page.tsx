'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

const RISK_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  red: { bg: COLORS.redLight, border: COLORS.red, label: '高风险' },
  yellow: { bg: COLORS.yellowLight, border: COLORS.yellow, label: '中风险' },
  blue: { bg: COLORS.blueLight, border: COLORS.blue, label: '低风险' },
};

interface SnackRef {
  id: number;
  name: string;
  riskLevel: string;
  riskLabel: string;
  imageData: string | null;
  recordTime: string;
}

interface IngredientData {
  ingredientName: string;
  snackCount: number;
  snacks: SnackRef[];
}

export default function IngredientPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [data, setData] = useState<IngredientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ingredients/${encodeURIComponent(name)}`).then(res => {
      if (res.status === 401) { router.replace('/login'); return; }
      return res.json();
    }).then(d => {
      if (d) setData(d);
      setLoading(false);
    });
  }, [name, router]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: COLORS.textLight }}>加载中...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: COLORS.textLight }}>未找到数据</div>;
  }

  return (
    <main style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px',
          padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: COLORS.textLight, cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        返回
      </button>

      <div style={{
        background: '#fff', borderRadius: '12px', padding: '1.5rem',
        border: `2px solid ${COLORS.greenLight}`, marginBottom: '1rem',
      }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', color: COLORS.greenDark }}>
          {data.ingredientName}
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.textLight }}>
          该配料出现在你的 <strong style={{ color: COLORS.text }}>{data.snackCount}</strong> 条零食记录中
        </p>
      </div>

      <div style={{
        background: '#fff', borderRadius: '12px', padding: '1.25rem',
        border: `1px solid ${COLORS.greenLight}`,
      }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: COLORS.text }}>
          含有此配料的零食
        </h2>

        {data.snacks.length === 0 ? (
          <p style={{ color: COLORS.textLight, fontSize: '0.9rem' }}>暂无记录</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {data.snacks.map(snack => {
              const rc = RISK_COLORS[snack.riskLevel] || RISK_COLORS.blue;
              return (
                <div key={snack.id} style={{
                  display: 'flex', gap: '0.75rem', alignItems: 'center',
                  padding: '0.6rem 0.75rem', borderRadius: '8px',
                  border: `1px solid ${COLORS.greenLight}`, background: COLORS.bg,
                }}>
                  {snack.imageData && (
                    <img src={snack.imageData} alt={snack.name} style={{
                      width: '48px', height: '48px', objectFit: 'cover',
                      borderRadius: '6px', border: `1px solid ${COLORS.greenLight}`, flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: COLORS.text }}>{snack.name}</span>
                      <span style={{
                        padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                        background: rc.bg, color: COLORS.text, border: `1px solid ${rc.border}`,
                      }}>{snack.riskLabel}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: COLORS.textLight }}>{snack.recordTime}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
