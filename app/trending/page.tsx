'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const COLORS = {
  green: '#7ecf5f',
  greenDark: '#5ba33d',
  greenLight: '#e8f5e0',
  yellow: '#f9d84d',
  red: '#e74c3c',
  bg: '#fafff5',
  text: '#3d4a2e',
  textLight: '#6b7a55',
};

interface TrendingIngredient {
  name: string;
  iarcLevel: string;
  riskLevel: string;
  totalCount: number;
  relatedSnacksCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendingData {
  ingredients: TrendingIngredient[];
  summary: {
    totalHighRiskIngredients: number;
    weeklyNewCount: number;
  };
}

export default function TrendingPage() {
  const router = useRouter();
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trending')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const getRiskColor = (riskLevel: string) => {
    if (riskLevel === 'red') return { bg: '#fdecea', border: COLORS.red, text: COLORS.red };
    return { bg: '#fff9e0', border: COLORS.yellow, text: '#b8860b' };
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return COLORS.red;
    if (trend === 'down') return COLORS.green;
    return COLORS.textLight;
  };

  if (loading) {
    return (
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem' }}>
        <p style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}>加载中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
      >
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>
          配料热搜榜
        </h1>
        <button
          onClick={() => router.push('/library')}
          style={{
            background: 'none',
            border: `1px solid ${COLORS.greenLight}`,
            borderRadius: '6px',
            padding: '0.4rem 1rem',
            fontSize: '0.9rem',
            color: COLORS.text,
            cursor: 'pointer',
          }}
        >
          返回食物库
        </button>
      </motion.div>

      {data && (
        <>
          {/* 统计概览 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1rem',
              border: `1px solid ${COLORS.greenLight}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.red }}>
                {data.summary.totalHighRiskIngredients}
              </div>
              <div style={{ fontSize: '0.85rem', color: COLORS.textLight }}>
                高风险配料种类
              </div>
            </div>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1rem',
              border: `1px solid ${COLORS.greenLight}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.yellow }}>
                {data.summary.weeklyNewCount}
              </div>
              <div style={{ fontSize: '0.85rem', color: COLORS.textLight }}>
                本周新增预警
              </div>
            </div>
          </div>

          {/* 排行列表 */}
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            border: `1px solid ${COLORS.greenLight}`,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 80px 100px 100px 60px',
              padding: '0.75rem 1rem',
              background: COLORS.bg,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: COLORS.textLight,
              borderBottom: `1px solid ${COLORS.greenLight}`,
            }}>
              <span>排名</span>
              <span>配料名称</span>
              <span>IARC</span>
              <span style={{ textAlign: 'right' }}>出现次数</span>
              <span style={{ textAlign: 'right' }}>涉及食物</span>
              <span style={{ textAlign: 'center' }}>趋势</span>
            </div>

            {data.ingredients.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textLight }}>
                暂无高风险配料数据
              </div>
            ) : (
              data.ingredients.map((item, index) => {
                const riskColor = getRiskColor(item.riskLevel);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => router.push(`/ingredient/${encodeURIComponent(item.name)}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 80px 100px 100px 60px',
                      padding: '0.75rem 1rem',
                      borderBottom: `1px solid ${COLORS.greenLight}`,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      fontWeight: 700,
                      color: index < 3 ? COLORS.red : COLORS.textLight,
                      fontSize: '1rem',
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: COLORS.text }}>
                      {item.name}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: riskColor.bg,
                      color: riskColor.text,
                      border: `1px solid ${riskColor.border}`,
                      textAlign: 'center',
                      width: 'fit-content',
                    }}>
                      {item.iarcLevel}类
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 600, color: COLORS.text }}>
                      {item.totalCount.toLocaleString()}
                    </span>
                    <span style={{ textAlign: 'right', color: COLORS.textLight }}>
                      {item.relatedSnacksCount}
                    </span>
                    <span style={{
                      textAlign: 'center',
                      fontWeight: 700,
                      color: getTrendColor(item.trend),
                      fontSize: '1.1rem',
                    }}>
                      {getTrendIcon(item.trend)}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>

          <p style={{
            fontSize: '0.75rem',
            color: COLORS.textLight,
            textAlign: 'center',
            marginTop: '1rem',
          }}>
            数据基于最近 30 天全站用户的打卡记录
          </p>
        </>
      )}
    </main>
  );
}
