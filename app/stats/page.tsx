'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';

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

interface Checkin {
  id: number;
  snackId: number;
  date: string;
  name: string;
  riskLevel: string;
  ingredients: string[];
}

export default function StatsPage() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [allSnacks, setAllSnacks] = useState<{id: number, name: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedSnackId, setSelectedSnackId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCheckins = async () => {
    const res = await fetch('/api/checkins');
    if (res.ok) setCheckins(await res.json());
  };

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) { router.replace('/login'); return; }
      return res.json();
    }).then(data => {
      if (data?.username) setUsername(data.username);
    });

    fetchCheckins().then(() => setLoading(false));

    // 获取所有零食供补录选择
    fetch('/api/snacks?scope=all')
      .then(res => res.json())
      .then(data => setAllSnacks(data));
  }, [router]);

  const handleRetroactiveCheckin = async () => {
    if (!selectedSnackId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          snackId: parseInt(selectedSnackId),
          date: selectedDate.toLocaleDateString('en-CA')
        }),
      });
      if (res.ok) {
        await fetchCheckins();
        setSelectedSnackId('');
        alert('补录成功！');
      } else {
        alert('补录失败，请重试');
      }
    } catch (err) {
      console.error(err);
      alert('发生错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取选中日期的记录
  const dayRecords = useMemo(() => {
    // 统一使用本地时区格式化的 YYYY-MM-DD
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    return checkins.filter(c => c.date === dateStr);
  }, [selectedDate, checkins]);

  // 统计数据计算
  const stats = useMemo(() => {
    const getTopItems = (filteredCheckins: Checkin[]) => {
      const snackCounts: Record<string, number> = {};
      const ingredientCounts: Record<string, number> = {};

      filteredCheckins.forEach(c => {
        snackCounts[c.name] = (snackCounts[c.name] || 0) + 1;
        c.ingredients?.forEach(ing => {
          ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
        });
      });

      const topSnacks = Object.entries(snackCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const topIngredients = Object.entries(ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return { topSnacks, topIngredients };
    };

    const now = new Date();
    const nowStr = now.toLocaleDateString('en-CA');
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toLocaleDateString('en-CA');

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
    const oneMonthAgoStr = oneMonthAgo.toLocaleDateString('en-CA');

    const weekCheckins = checkins.filter(c => c.date >= oneWeekAgoStr && c.date <= nowStr);
    const monthCheckins = checkins.filter(c => c.date >= oneMonthAgoStr && c.date <= nowStr);

    return {
      week: getTopItems(weekCheckins),
      month: getTopItems(monthCheckins)
    };
  }, [checkins]);

  const tileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dateStr = date.toLocaleDateString('en-CA');
      const hasRecord = checkins.some(c => c.date === dateStr);
      return hasRecord ? 'has-record' : null;
    }
    return null;
  };

  return (
    <main style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif', color: COLORS.text }}>
      <style>{`
        .react-calendar { border: none; border-radius: 12px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); width: 100%; padding: 1rem; }
        .has-record { background: ${COLORS.greenLight} !important; border-radius: 50%; color: ${COLORS.greenDark} !important; font-weight: bold; }
        .react-calendar__tile--active { background: ${COLORS.green} !important; border-radius: 50%; }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.5rem 0' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>健康周报 & 日历</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/library')} style={{ background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer', fontWeight: 600 }}>食物库</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/')} style={{ background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer', fontWeight: 600 }}>首页</motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: COLORS.greenDark }}>食用日历</h2>
          <Calendar 
            onChange={(val) => setSelectedDate(val as Date)} 
            value={selectedDate}
            tileClassName={tileClassName}
          />
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: COLORS.greenDark }}>补录零食 ({selectedDate.toLocaleDateString()})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={selectedSnackId} 
                onChange={(e) => setSelectedSnackId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.greenLight}`,
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="">选择要补录的食物...</option>
                {allSnacks.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!selectedSnackId || isSubmitting}
                onClick={handleRetroactiveCheckin}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: COLORS.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: (selectedSnackId && !isSubmitting) ? 'pointer' : 'not-allowed',
                  opacity: (selectedSnackId && !isSubmitting) ? 1 : 0.6
                }}
              >
                {isSubmitting ? '...' : '补录'}
              </motion.button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{selectedDate.toLocaleDateString()} 的记录</h3>
            {dayRecords.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: COLORS.textLight }}>
                {dayRecords.map(r => (
                  <li key={r.id} style={{ marginBottom: '0.2rem' }}>{r.name}</li>
                ))}
              </ul>
            ) : <p style={{ fontSize: '0.85rem', color: COLORS.textLight, margin: 0 }}>当天没有记录</p>}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: COLORS.bg, borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: COLORS.greenDark }}>近一周汇总</h2>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>吃得最多的零食：</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                {stats.week.topSnacks.map(([name, count]) => (
                  <span key={name} style={{ background: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', border: `1px solid ${COLORS.greenLight}` }}>{name} ({count}次)</span>
                ))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>摄入最多的配料：</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                {stats.week.topIngredients.map(([name, count]) => (
                  <span key={name} style={{ background: COLORS.yellowLight, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', border: `1px solid ${COLORS.yellow}` }}>{name} ({count}次)</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: COLORS.greenDark }}>近一月汇总</h2>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>最常回购：</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                {stats.month.topSnacks.map(([name, count]) => (
                  <span key={name} style={{ background: '#f8f9fa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', border: `1px solid #ddd` }}>{name} ({count}次)</span>
                ))}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>主要配料：</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                {stats.month.topIngredients.map(([name, count]) => (
                  <span key={name} style={{ background: COLORS.blueLight, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', border: `1px solid ${COLORS.blue}` }}>{name} ({count}次)</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
