'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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

interface HealthInsights {
  warnings: Array<{
    ingredient: string;
    iarcLevel: string;
    riskLevel: string;
    consecutiveDays: number;
    totalCount: number;
    message: string;
  }>;
  profile: {
    riskScore: number;
    topRiskIngredients: Array<{
      name: string;
      count: number;
      iarcLevel: string;
      riskLevel: string;
    }>;
  };
}

interface CheckinStats {
  consecutiveDays: number;
  monthlyCalories: number;
  monthlyCheckins: number;
}

// 计算连续打卡天数
function calcConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = Array.from(new Set(dates)).sort().reverse();
  let count = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diff = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export default function ReportPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [checkinStats, setCheckinStats] = useState<CheckinStats | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取用户信息
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) { router.replace('/login'); return; }
        const meData = await meRes.json();
        setUsername(meData.username);

        // 获取健康洞察
        const insightsRes = await fetch('/api/health-insights');
        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setInsights({
            warnings: data.warnings || [],
            profile: data.profile || { riskScore: 0, topRiskIngredients: [] },
          });
        }

        // 获取打卡记录并计算统计
        const checkinsRes = await fetch('/api/checkins');
        if (checkinsRes.ok) {
          const checkins = await checkinsRes.json();
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
          const nowStr = now.toLocaleDateString('en-CA');
          const monthCheckins = checkins.filter((c: { date: string }) => c.date >= monthStart && c.date <= nowStr);
          const allDates = checkins.map((c: { date: string }) => c.date);

          setCheckinStats({
            consecutiveDays: calcConsecutiveDays(allDates),
            monthlyCalories: monthCheckins.reduce((sum: number, c: { calories: number | null }) => sum + (c.calories || 0), 0),
            monthlyCheckins: monthCheckins.length,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !insights || !checkinStats) return;

    setGenerating(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 750;
    const padding = 40;

    // 先预计算总高度
    let totalHeight = 200; // 头部
    totalHeight += 140; // 打卡成就区
    totalHeight += 30; // 风险警示标题
    if (insights.profile.topRiskIngredients.length > 0) {
      totalHeight += 25; // 高风险配料标题
      totalHeight += Math.min(insights.profile.topRiskIngredients.length, 5) * 30;
    }
    totalHeight += 10;
    if (insights.warnings.length > 0) {
      totalHeight += 25; // 预警标题
      totalHeight += Math.min(insights.warnings.length, 3) * 25;
    }
    totalHeight += 80; // 底部

    // 设置画布尺寸（一次性设置好）
    canvas.width = width;
    canvas.height = totalHeight;

    // 背景
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, canvas.height);

    // 头部背景
    const headerGradient = ctx.createLinearGradient(0, 0, width, 200);
    headerGradient.addColorStop(0, COLORS.green);
    headerGradient.addColorStop(1, COLORS.greenDark);
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 200);

    // 用户名和日期
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.fillText(username, padding, 50);
    ctx.font = '16px system-ui';
    ctx.fillText(new Date().toLocaleDateString('zh-CN'), padding, 80);

    // 风险评分
    const score = insights.profile.riskScore;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), width / 2, 140);
    ctx.font = '18px system-ui';
    ctx.fillText('风险评分', width / 2, 170);
    ctx.textAlign = 'left';

    let currentY = 220;

    // 打卡成就区
    ctx.fillStyle = '#fff';
    ctx.fillRect(padding, currentY, width - padding * 2, 120);
    ctx.strokeStyle = COLORS.greenLight;
    ctx.strokeRect(padding, currentY, width - padding * 2, 120);

    const achievements = [
      { label: '连续打卡', value: checkinStats.consecutiveDays.toString(), unit: '天' },
      { label: '本月热量', value: Math.round(checkinStats.monthlyCalories).toString(), unit: 'kcal' },
      { label: '本月打卡', value: checkinStats.monthlyCheckins.toString(), unit: '次' },
    ];

    achievements.forEach((item, i) => {
      const x = padding + (width - padding * 2) / 3 * i + (width - padding * 2) / 6;
      ctx.fillStyle = COLORS.greenDark;
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(item.value, x, currentY + 50);
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '14px system-ui';
      ctx.fillText(item.unit, x + ctx.measureText(item.value).width / 2 + 5, currentY + 50);
      ctx.fillText(item.label, x, currentY + 80);
    });

    ctx.textAlign = 'left';
    currentY += 140;

    // 风险警示区标题
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('风险警示', padding, currentY);
    currentY += 30;

    // 高风险配料 Top5
    if (insights.profile.topRiskIngredients.length > 0) {
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '14px system-ui';
      ctx.fillText('高风险配料 Top5', padding, currentY);
      currentY += 25;

      insights.profile.topRiskIngredients.slice(0, 5).forEach((item, i) => {
        const riskColor = item.riskLevel === 'red' ? COLORS.red : COLORS.yellow;
        ctx.fillStyle = riskColor;
        ctx.fillRect(padding, currentY, 4, 20);
        ctx.fillStyle = COLORS.text;
        ctx.font = '16px system-ui';
        ctx.fillText(`${i + 1}. ${item.name}`, padding + 15, currentY + 16);
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '14px system-ui';
        ctx.fillText(`${item.count}次`, width - padding - 50, currentY + 16);
        currentY += 30;
      });
    }

    currentY += 10;

    // 预警信息
    if (insights.warnings.length > 0) {
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '14px system-ui';
      ctx.fillText('最近预警', padding, currentY);
      currentY += 25;

      insights.warnings.slice(0, 3).forEach((warning) => {
        ctx.fillStyle = COLORS.red;
        ctx.font = '14px system-ui';
        const maxChars = 35;
        const text = warning.message.length > maxChars
          ? warning.message.substring(0, maxChars) + '...'
          : warning.message;
        ctx.fillText(text, padding, currentY + 16);
        currentY += 25;
      });
    }

    // 底部
    currentY += 30;
    ctx.fillStyle = COLORS.greenDark;
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('食物健康助手', width / 2, currentY);
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '12px system-ui';
    ctx.fillText('关注配料健康，从记录开始', width / 2, currentY + 25);
    ctx.textAlign = 'left';

    setGenerating(false);
  }, [insights, checkinStats, username]);

  useEffect(() => {
    if (!loading && insights && checkinStats) {
      drawPoster();
    }
  }, [loading, insights, checkinStats, drawPoster]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `健康报告_${new Date().toLocaleDateString('zh-CN')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
          我的健康报告
        </h1>
        <button
          onClick={() => router.push('/stats')}
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
          返回统计
        </button>
      </motion.div>

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        border: `1px solid ${COLORS.greenLight}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            maxWidth: '750px',
            margin: '0 auto',
            display: 'block',
            borderRadius: '8px',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={generating}
            style={{
              padding: '0.8rem 2rem',
              background: COLORS.green,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? '生成中...' : '保存到相册'}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
