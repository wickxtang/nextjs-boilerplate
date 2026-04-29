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
      totalHeight += 30; // 高风险配料标题
      totalHeight += Math.min(insights.profile.topRiskIngredients.length, 5) * 38;
    }
    totalHeight += 16;
    if (insights.warnings.length > 0) {
      totalHeight += 30; // 预警标题
      totalHeight += Math.min(insights.warnings.length, 3) * 44;
    }
    totalHeight += 80; // 底部

    // 设置画布尺寸（一次性设置好）
    canvas.width = width;
    canvas.height = totalHeight;

    // 整体浅色背景
    ctx.fillStyle = '#f8f6f1';
    ctx.fillRect(0, 0, width, canvas.height);

    // 头部 - 白色卡片风格
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, 200);

    // 顶部装饰条 - 绿色 + 草黄色双色
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(0, 4, width, 3);

    // 左侧绿色竖条装饰
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(padding - 12, 30, 4, 50);

    // 用户名和日期
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '14px system-ui';
    ctx.fillText(new Date().toLocaleDateString('zh-CN'), padding, 40);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(username + ' 的健康报告', padding, 68);

    // 风险评分 - 居中，用绿色大字
    const score = insights.profile.riskScore;
    ctx.fillStyle = COLORS.greenDark;
    ctx.font = 'bold 72px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), width / 2, 145);
    ctx.font = '13px system-ui';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('风险评分（越低越好）', width / 2, 170);

    // 评分下方草黄色装饰线
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(width / 2 - 40, 180, 80, 2);

    ctx.textAlign = 'left';

    let currentY = 220;

    // 打卡成就区 - 白色卡片
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(padding, currentY, width - padding * 2, 120, 8);
    ctx.fill();
    // 左侧绿色装饰条
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(padding, currentY + 20, 3, 80);

    const achievements = [
      { label: '连续打卡', value: checkinStats.consecutiveDays.toString(), unit: '天' },
      { label: '本月热量', value: Math.round(checkinStats.monthlyCalories).toString(), unit: 'kcal' },
      { label: '本月打卡', value: checkinStats.monthlyCheckins.toString(), unit: '次' },
    ];

    achievements.forEach((item, i) => {
      const x = padding + (width - padding * 2) / 3 * i + (width - padding * 2) / 6;
      // 数值 + 单位放在一行，用小号单位
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 28px system-ui';
      const valueWidth = ctx.measureText(item.value).width;
      ctx.font = '14px system-ui';
      const unitWidth = ctx.measureText(item.unit).width;
      const totalWidth = valueWidth + unitWidth + 4;
      const startX = x - totalWidth / 2;
      // 绘制数值
      ctx.font = 'bold 28px system-ui';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(item.value, startX, currentY + 50);
      // 绘制单位（与数值底部对齐）
      ctx.font = '14px system-ui';
      ctx.fillStyle = COLORS.textLight;
      ctx.fillText(item.unit, startX + valueWidth + 4, currentY + 50);
      // 绘制标签
      ctx.textAlign = 'center';
      ctx.font = '13px system-ui';
      ctx.fillStyle = COLORS.textLight;
      ctx.fillText(item.label, x, currentY + 78);
    });

    ctx.textAlign = 'left';
    currentY += 160;

    // 风险警示区 - 白色卡片
    const warningCardY = currentY;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(padding, warningCardY, width - padding * 2, totalHeight - currentY - 80, 8);
    ctx.fill();

    // 风险警示区标题
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px system-ui';
    ctx.fillText('风险警示', padding + 16, currentY + 28);
    // 草黄色小装饰
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(padding + 16, currentY + 36, 24, 2);
    currentY += 50;

    // 高风险配料 Top5
    if (insights.profile.topRiskIngredients.length > 0) {
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '12px system-ui';
      ctx.fillText('高风险配料 Top5', padding + 16, currentY);
      currentY += 28;

      insights.profile.topRiskIngredients.slice(0, 5).forEach((item, i) => {
        const riskColor = item.riskLevel === 'red' ? COLORS.red : COLORS.yellow;
        const itemPadding = padding + 16;
        // 风险色块
        ctx.fillStyle = riskColor;
        ctx.beginPath();
        ctx.roundRect(itemPadding, currentY, 24, 24, 4);
        ctx.fill();
        // 排名数字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText((i + 1).toString(), itemPadding + 12, currentY + 17);
        ctx.textAlign = 'left';
        // 配料名称
        ctx.fillStyle = COLORS.text;
        ctx.font = '15px system-ui';
        ctx.fillText(item.name, itemPadding + 34, currentY + 17);
        // 出现次数
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '13px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`${item.count}次`, width - padding - 16, currentY + 17);
        ctx.textAlign = 'left';
        currentY += 38;
      });
    }

    currentY += 16;

    // 预警信息
    if (insights.warnings.length > 0) {
      const warnPadding = padding + 16;
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '12px system-ui';
      ctx.fillText('最近预警', warnPadding, currentY);
      currentY += 28;

      insights.warnings.slice(0, 3).forEach((warning) => {
        // 预警背景
        ctx.fillStyle = '#fef2f2';
        ctx.beginPath();
        ctx.roundRect(warnPadding, currentY, width - padding * 2 - 32, 36, 6);
        ctx.fill();
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 1;
        ctx.stroke();
        // 预警图标
        ctx.fillStyle = COLORS.red;
        ctx.font = 'bold 14px system-ui';
        ctx.fillText('!', warnPadding + 12, currentY + 24);
        // 预警文字
        ctx.fillStyle = COLORS.text;
        ctx.font = '13px system-ui';
        const maxChars = 38;
        const text = warning.message.length > maxChars
          ? warning.message.substring(0, maxChars) + '...'
          : warning.message;
        ctx.fillText(text, warnPadding + 28, currentY + 24);
        currentY += 44;
      });
    }

    // 底部
    currentY += 30;
    // 草黄色装饰线
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(width / 2 - 30, currentY - 10, 60, 2);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('食物健康助手', width / 2, currentY + 10);
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '12px system-ui';
    ctx.fillText('关注配料健康，从记录开始', width / 2, currentY + 30);
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
