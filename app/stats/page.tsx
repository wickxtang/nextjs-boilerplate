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
  category: string;
  riskLevel: string;
  ingredients: string[];
  amount: number | null;
  calories: number | null;
}

interface MealFoodItem {
  name: string;
  category: string;
  estimated_amount: number;
  estimated_calories: number;
  energy_kj?: number;
}

interface MealRecord {
  id: number;
  mealType: string;
  imageData: string | null;
  foodItems: MealFoodItem[];
  totalCalories: number | null;
  mealDate: string;
  createdAt: string;
}

const DIETARY_TARGETS: Record<string, { label: string; min: number; max: number; unit: string; color: string }> = {
  grain: { label: '谷薯类', min: 250, max: 400, unit: 'g', color: '#8e44ad' },
  vegetable: { label: '蔬菜类', min: 300, max: 500, unit: 'g', color: '#27ae60' },
  fruit: { label: '水果类', min: 200, max: 350, unit: 'g', color: '#e67e22' },
  meat_egg: { label: '畜禽肉蛋', min: 120, max: 200, unit: 'g', color: '#c0392b' },
  aquatic: { label: '水产品', min: 40, max: 75, unit: 'g', color: '#2980b9' },
  dairy: { label: '奶及制品', min: 300, max: 500, unit: 'g', color: '#34495e' },
  soy_nut: { label: '大豆坚果', min: 25, max: 35, unit: 'g', color: '#f1c40f' },
};

export default function StatsPage() {
  const router = useRouter();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [allSnacks, setAllSnacks] = useState<{id: number, name: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedSnackId, setSelectedSnackId] = useState<string>('');
  const [snackSearchQuery, setSnackSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retroAmount, setRetroAmount] = useState<string>('100');

  // 三餐记录相关状态
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [mealUploading, setMealUploading] = useState<string | null>(null);
  const [mealRecognizing, setMealRecognizing] = useState<string | null>(null);
  const [recognizedFoods, setRecognizedFoods] = useState<{ mealType: string; foods: MealFoodItem[]; totalCalories: number; imageData: string } | null>(null);
  const [mealPreviewImage, setMealPreviewImage] = useState<string | null>(null);
  const [addToLibraryItem, setAddToLibraryItem] = useState<MealFoodItem | null>(null);
  const [addToLibraryName, setAddToLibraryName] = useState('');
  const [addToLibraryCategory, setAddToLibraryCategory] = useState('other');
  const [addToLibraryCalories, setAddToLibraryCalories] = useState('');
  const [addingToLibrary, setAddingToLibrary] = useState(false);

  // 健康洞察相关状态
  const [healthInsights, setHealthInsights] = useState<{
    warnings: Array<{
      ingredient: string;
      iarcLevel: string;
      riskLevel: string;
      consecutiveDays: number;
      totalCount: number;
      relatedSnacks: string[];
      message: string;
    }>;
    trends: {
      currentMonth: Array<{
        ingredient: string;
        currentCount: number;
        lastCount: number;
        change: number;
        iarcLevel: string;
        riskLevel: string;
        trend: string;
      }>;
      summary: {
        totalIngredientsCurrent: number;
        totalIngredientsLast: number;
      };
    };
    profile: {
      riskScore: number;
      riskDistribution: {
        red: { count: number; ingredients: string[] };
        yellow: { count: number; ingredients: string[] };
        blue: { count: number; ingredients: string[] };
      };
      topRiskIngredients: Array<{
        name: string;
        count: number;
        iarcLevel: string;
        riskLevel: string;
      }>;
      totalCheckins: number;
      uniqueIngredients: number;
    };
    aiInterpretation: string;
    computedAt: string;
    cached: boolean;
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const fetchCheckins = async () => {
    const res = await fetch('/api/checkins');
    if (res.ok) setCheckins(await res.json());
  };

  const fetchMeals = async () => {
    const res = await fetch('/api/meals');
    if (res.ok) setMeals(await res.json());
  };

  const fetchHealthInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/health-insights');
      if (res.ok) {
        const data = await res.json();
        setHealthInsights(data);
      }
    } catch (err) {
      console.error('获取健康洞察失败:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const MEAL_TYPES = [
    { key: 'breakfast', label: '早餐' },
    { key: 'lunch', label: '午餐' },
    { key: 'dinner', label: '晚餐' },
  ];

  const CATEGORY_OPTIONS = [
    { value: 'grain', label: '谷薯类' },
    { value: 'vegetable', label: '蔬菜类' },
    { value: 'fruit', label: '水果类' },
    { value: 'meat_egg', label: '畜禽肉蛋' },
    { value: 'aquatic', label: '水产品' },
    { value: 'dairy', label: '奶及制品' },
    { value: 'soy_nut', label: '大豆坚果' },
    { value: 'snack', label: '零食' },
    { value: 'drink', label: '饮料' },
    { value: 'other', label: '其他' },
  ];

  const handleMealPhoto = async (mealType: string, file: File) => {
    setMealUploading(mealType);

    const reader = new FileReader();
    reader.onload = () => {};
    const imageBase64 = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });

    setMealRecognizing(mealType);
    setMealUploading(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/meals/recognize', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setRecognizedFoods({
          mealType,
          foods: data.food_items,
          totalCalories: data.total_calories,
          imageData: imageBase64,
        });
      } else {
        alert(data.error || '识别失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setMealRecognizing(null);
    }
  };

  const saveMealRecord = async () => {
    if (!recognizedFoods) return;
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType: recognizedFoods.mealType,
          mealDate: dateStr,
          imageData: recognizedFoods.imageData,
          foodItems: recognizedFoods.foods,
          totalCalories: recognizedFoods.totalCalories,
        }),
      });
      if (res.ok) {
        await fetchMeals();
        setRecognizedFoods(null);
      } else {
        alert('保存失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  const deleteMealRecord = async (id: number) => {
    if (!confirm('确定要删除这条三餐记录吗？')) return;
    try {
      const res = await fetch(`/api/meals?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchMeals();
      else alert('删除失败');
    } catch {
      alert('网络错误');
    }
  };

  const handleAddToLibrary = async () => {
    if (!addToLibraryItem) return;
    setAddingToLibrary(true);
    try {
      const caloriesKcal = parseFloat(addToLibraryCalories) || addToLibraryItem.estimated_calories;
      const energyKj = caloriesKcal * 4.184;
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addToLibraryName,
          category: addToLibraryCategory,
          ingredients: [],
          isPrivate: true,
          nutrition: {
            energy_kj: Math.round(energyKj * 10) / 10,
            serving_size: 100,
            serving_unit: 'g',
          },
        }),
      });
      if (res.ok) {
        setAddToLibraryItem(null);
        alert('已添加到私人食物库');
      } else {
        alert('添加失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setAddingToLibrary(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) { router.replace('/login'); return; }
      return res.json();
    }).then(data => {
      if (data?.username) setUsername(data.username);
    });

    fetchCheckins().then(() => setLoading(false));
    fetchMeals();

    // 获取所有零食供补录选择
    fetch('/api/snacks?scope=all')
      .then(res => res.json())
      .then(data => setAllSnacks(data));

    // 获取健康洞察
    fetchHealthInsights();
  }, [router]);

  const handleRetroactiveCheckin = async () => {
    if (!selectedSnackId) return;
    setIsSubmitting(true);
    try {
      // 获取食物详情以计算热量
      const snackRes = await fetch(`/api/snacks/${selectedSnackId}`);
      const snackData = await snackRes.json();
      const amount = parseFloat(retroAmount) || 0;
      const energyKj = snackData.nutrition?.energy_kj || 0;
      const calories = (energyKj / 4.184) * (amount / 100);

      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          snackId: parseInt(selectedSnackId),
          date: selectedDate.toLocaleDateString('en-CA'),
          amount,
          calories: Math.round(calories * 10) / 10
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

  const deleteCheckin = async (id: number) => {
    if (!confirm('确定要删除这条打卡记录吗？')) return;
    try {
      const res = await fetch(`/api/checkins?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCheckins();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      console.error(err);
      alert('发生错误');
    }
  };

  // 获取选中日期的记录
  const dayRecords = useMemo(() => {
    // 统一使用本地时区格式化的 YYYY-MM-DD
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    return checkins.filter(c => c.date === dateStr);
  }, [selectedDate, checkins]);

  const dayMeals = useMemo(() => {
    const dateStr = selectedDate.toLocaleDateString('en-CA');
    return meals.filter(m => m.mealDate === dateStr);
  }, [selectedDate, meals]);

  // 计算每日膳食摄入达标情况
  const dietaryProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    Object.keys(DIETARY_TARGETS).forEach(key => progress[key] = 0);
    
    dayRecords.forEach(record => {
      if (progress[record.category] !== undefined) {
        progress[record.category] += record.amount || 0;
      }
    });
    return progress;
  }, [dayRecords]);

  // 统计数据计算
  const stats = useMemo(() => {
    const getTopItems = (filteredCheckins: Checkin[]) => {
      const snackCounts: Record<string, number> = {};
      const ingredientCounts: Record<string, number> = {};
      let totalCalories = 0;

      filteredCheckins.forEach(c => {
        snackCounts[c.name] = (snackCounts[c.name] || 0) + 1;
        c.ingredients?.forEach(ing => {
          ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1;
        });
        totalCalories += c.calories || 0;
      });

      const topSnacks = Object.entries(snackCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const topIngredients = Object.entries(ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return { topSnacks, topIngredients, totalCalories };
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
        
        /* 统一所有格子的基础样式 */
        .react-calendar__tile { 
          height: 48px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: none !important; /* 禁用默认背景，全部改用伪元素实现圆形 */
          position: relative;
          z-index: 1;
          margin: 2px 0;
          transition: all 0.2s;
          border: none !important;
        }

        /* 通用圆形底色容器 */
        .react-calendar__tile::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          z-index: -1;
          transition: all 0.2s;
        }

        /* 悬浮效果 - 灰色圆形 */
        .react-calendar__tile:enabled:hover::before {
          background: #f0f0f0;
        }

        /* 有打卡记录的状态 - 绿色圆形 */
        .has-record::before {
          background: ${COLORS.greenLight};
        }
        .has-record abbr { 
          color: ${COLORS.greenDark} !important; 
          font-weight: bold; 
        }

        /* 今天 - 调得更淡的橙色圆形 */
        .react-calendar__tile--now::before {
          background: #fff8e1 !important; /* 更淡更柔和的橙色 */
          border: 1px solid #ffe082; /* 增加一个极细的边框以便区分 */
        }
        .react-calendar__tile--now abbr { 
          color: #f57c00 !important; 
          font-weight: bold; 
        }

        /* 选中状态 - 绿色实心圆形 */
        .react-calendar__tile--active::before {
          background: ${COLORS.green} !important;
        }
        .react-calendar__tile--active abbr { 
          color: #fff !important; 
        }

        /* 修复邻近月份（非当前月）的文字颜色 */
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d1d1 !important;
        }
        
        /* 邻近月份悬浮也是圆形 */
        .react-calendar__month-view__days__day--neighboringMonth:enabled:hover::before {
          background: #f5f5f5;
        }

        /* 禁用默认的 focus 效果 */
        .react-calendar__tile:enabled:focus::before {
          background: #e8e8e8;
        }

        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1rem;
          margin-top: 8px;
          color: ${COLORS.greenDark};
          font-weight: 600;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: ${COLORS.greenLight};
          border-radius: 8px;
        }
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
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: COLORS.greenDark }}>食用日历</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const now = new Date();
                setSelectedDate(now);
                setActiveStartDate(now);
              }}
              style={{
                background: COLORS.greenLight,
                border: 'none',
                borderRadius: '15px',
                padding: '0.2rem 0.75rem',
                fontSize: '0.75rem',
                color: COLORS.greenDark,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              返回今天
            </motion.button>
          </div>
          <Calendar 
            onChange={(val) => setSelectedDate(val as Date)} 
            value={selectedDate}
            tileClassName={tileClassName}
            activeStartDate={activeStartDate || undefined}
            onActiveStartDateChange={({ activeStartDate: newActiveStartDate }) => setActiveStartDate(newActiveStartDate)}
          />
          <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: COLORS.greenDark }}>补录零食 ({selectedDate.toLocaleDateString()})</h3>
            
            {/* 补录搜索与选择 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  placeholder="输入名称搜索食物..."
                  value={snackSearchQuery}
                  onChange={(e) => setSnackSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.greenLight}`,
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {snackSearchQuery && (
                  <span 
                    onClick={() => setSnackSearchQuery('')}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#ccc', fontSize: '1rem' }}
                  >×</span>
                )}
              </div>

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
                  <option value="">{snackSearchQuery ? '在搜索结果中选择...' : '从全部食物中选择...'}</option>
                  {allSnacks
                    .filter(s => s.name.toLowerCase().includes(snackSearchQuery.toLowerCase()))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  }
                </select>
                <input
                  type="number"
                  placeholder="量(g/ml)"
                  value={retroAmount}
                  onChange={(e) => setRetroAmount(e.target.value)}
                  style={{
                    width: '70px',
                    padding: '0.4rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.greenLight}`,
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
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
          </div>

          {/* 近一周汇总 */}
          <div style={{ padding: '1.5rem', background: COLORS.bg, borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, color: COLORS.greenDark }}>近一周汇总</h2>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>总摄入热量</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: COLORS.greenDark }}>{Math.round(stats.week.totalCalories)} <span style={{ fontSize: '0.8rem' }}>kcal</span></div>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>吃得最多的食物：</strong>
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

          {/* 近一月汇总 */}
          <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, color: COLORS.greenDark }}>近一月汇总</h2>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>总摄入热量</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: COLORS.greenDark }}>{Math.round(stats.month.totalCalories)} <span style={{ fontSize: '0.8rem' }}>kcal</span></div>
              </div>
            </div>
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

          {/* 健康洞察模块 */}
          <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, color: COLORS.greenDark }}>🔍 健康洞察</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {healthInsights?.cached && (
                  <span style={{ fontSize: '0.7rem', color: COLORS.textLight }}>缓存于 {new Date(healthInsights.computedAt).toLocaleString()}</span>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchHealthInsights}
                  disabled={insightsLoading}
                  style={{
                    background: COLORS.greenLight,
                    border: 'none',
                    borderRadius: '15px',
                    padding: '0.2rem 0.75rem',
                    fontSize: '0.75rem',
                    color: COLORS.greenDark,
                    cursor: insightsLoading ? 'wait' : 'pointer',
                    fontWeight: 600,
                    opacity: insightsLoading ? 0.6 : 1,
                  }}
                >
                  {insightsLoading ? '加载中...' : '刷新'}
                </motion.button>
              </div>
            </div>

            {insightsLoading && !healthInsights ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.textLight }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                <div>正在分析您的健康数据...</div>
              </div>
            ) : healthInsights ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 预警信息 */}
                {healthInsights.warnings.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem', color: COLORS.red }}>⚠️ 摄入预警</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {healthInsights.warnings.map((warning, i) => (
                        <div key={i} style={{
                          padding: '0.75rem',
                          background: warning.riskLevel === 'red' ? COLORS.redLight : COLORS.yellowLight,
                          borderRadius: '8px',
                          border: `1px solid ${warning.riskLevel === 'red' ? COLORS.red : COLORS.yellow}`,
                          fontSize: '0.8rem',
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{warning.message}</div>
                          <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>
                            相关食品：{warning.relatedSnacks.join('、')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 风险成分 Top 3 */}
                {healthInsights.profile.topRiskIngredients.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem', color: COLORS.greenDark }}>🎯 你的风险成分 Top 3</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {healthInsights.profile.topRiskIngredients.slice(0, 3).map((ingredient, i) => (
                        <div key={i} style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: ingredient.riskLevel === 'red' ? COLORS.redLight : COLORS.yellowLight,
                          borderRadius: '8px',
                          border: `1px solid ${ingredient.riskLevel === 'red' ? COLORS.red : COLORS.yellow}`,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{ingredient.name}</div>
                          <div style={{ fontSize: '0.7rem', color: COLORS.textLight, marginTop: '0.25rem' }}>
                            {ingredient.iarcLevel}类致癌物
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                            摄入 {ingredient.count} 次
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 趋势分析 */}
                {healthInsights.trends.currentMonth.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem', color: COLORS.greenDark }}>📊 成分趋势（本月 vs 上月）</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {healthInsights.trends.currentMonth.slice(0, 5).map((trend, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                        }}>
                          <span style={{ fontWeight: 600 }}>{trend.ingredient}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: COLORS.textLight }}>
                              {trend.lastCount} → {trend.currentCount} 次
                            </span>
                            <span style={{
                              padding: '0.15rem 0.4rem',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: trend.trend === 'up' ? COLORS.redLight : trend.trend === 'down' ? COLORS.greenLight : '#f0f0f0',
                              color: trend.trend === 'up' ? COLORS.red : trend.trend === 'down' ? COLORS.greenDark : COLORS.textLight,
                            }}>
                              {trend.change > 0 ? '+' : ''}{trend.change}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI 解读 */}
                {healthInsights.aiInterpretation && (
                  <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #e8f5e0 0%, #f0f8e8 100%)',
                    borderRadius: '12px',
                    border: `1px solid ${COLORS.greenLight}`,
                  }}>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem', color: COLORS.greenDark }}>🤖 AI 健康顾问</h3>
                    <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.6, color: COLORS.text }}>
                      {healthInsights.aiInterpretation}
                    </p>
                  </div>
                )}

                {/* 风险评分 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: healthInsights.profile.riskScore > 30 ? COLORS.red : healthInsights.profile.riskScore > 10 ? COLORS.yellow : COLORS.green }}>
                      {healthInsights.profile.riskScore}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>风险评分</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.greenDark }}>
                      {healthInsights.profile.totalCheckins}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>总打卡次数</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.blue }}>
                      {healthInsights.profile.uniqueIngredients}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>摄入配料种类</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.textLight }}>
                <div>暂无健康洞察数据</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>多打卡几次食物后，系统会为您生成个性化健康报告</div>
              </div>
            )}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 当日热量汇总看板 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ 
              padding: '1.25rem', 
              background: 'linear-gradient(135deg, #7ecf5f 0%, #5ba33d 100%)', 
              borderRadius: '16px', 
              color: '#fff',
              boxShadow: '0 8px 20px rgba(91, 163, 61, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.25rem' }}>今日已摄入热量</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.2rem 0' }}>
              {Math.round(dayRecords.reduce((sum, r) => sum + (r.calories || 0), 0))}
              <span style={{ fontSize: '1rem', fontWeight: 400, marginLeft: '0.4rem', opacity: 0.8 }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>共打卡 {dayRecords.length} 次食物</div>
          </motion.div>

          {/* 膳食指南摄入进度 */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: `1px solid ${COLORS.greenLight}` }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', color: COLORS.greenDark, fontWeight: 700 }}>当日膳食摄入达标情况</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {Object.entries(DIETARY_TARGETS).map(([key, target]) => {
                const current = dietaryProgress[key] || 0;
                const percentage = Math.min((current / target.min) * 100, 100);
                const isEnough = current >= target.min;
                const isOver = current > target.max;

                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600 }}>{target.label}</span>
                      <span style={{ color: isOver ? COLORS.red : (isEnough ? COLORS.greenDark : COLORS.textLight) }}>
                        {current}{target.unit} / {target.min}-{target.max}{target.unit}
                        {isEnough ? ' ✅' : ''}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        style={{ 
                          height: '100%', 
                          background: isEnough ? (isOver ? COLORS.red : target.color) : target.color,
                          opacity: isEnough ? 1 : 0.5,
                          borderRadius: '4px' 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '0.7rem', color: COLORS.textLight, marginTop: '1rem', fontStyle: 'italic' }}>
              * 进度条到达 100% 表示达到指南推荐的每日最低摄入量。
            </p>
          </div>

          {/* 当日记录详情 */}
          <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', margin: 0 }}>{selectedDate.toLocaleDateString()} 的记录</h3>
              {dayRecords.length > 0 && (
                <span style={{ fontSize: '0.85rem', color: COLORS.greenDark, fontWeight: 700 }}>
                  总热量: {Math.round(dayRecords.reduce((sum, r) => sum + (r.calories || 0), 0))} kcal
                </span>
              )}
            </div>
            {dayRecords.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: COLORS.textLight }}>
                {dayRecords.map(r => (
                  <li key={r.id} style={{ marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {r.name} 
                        <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.4rem' }}>
                          ({r.amount || 0}{r.category === 'drink' ? 'ml' : 'g'}) · {Math.round(r.calories || 0)} kcal
                        </span>
                      </span>
                      <button 
                        onClick={() => deleteCheckin(r.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ccc', 
                          cursor: 'pointer', 
                          fontSize: '0.75rem',
                          padding: '2px 4px'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: '0.85rem', color: COLORS.textLight, margin: 0 }}>当天没有记录</p>}
          </div>

          {/* 三餐拍照记录 */}
          <div style={{ padding: '1.25rem', background: '#fff', borderRadius: '16px', border: `1px solid ${COLORS.greenLight}` }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem', color: COLORS.greenDark, fontWeight: 700 }}>
              {selectedDate.toLocaleDateString()} 三餐记录
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {MEAL_TYPES.map(({ key, label }) => {
                const existingMeal = dayMeals.find(m => m.mealType === key);
                const isUploading = mealUploading === key;
                const isRecognizing = mealRecognizing === key;

                return (
                  <div key={key} style={{
                    border: `1px solid ${existingMeal ? COLORS.green : COLORS.greenLight}`,
                    borderRadius: '12px',
                    padding: '0.75rem',
                    textAlign: 'center',
                    background: existingMeal ? COLORS.greenLight : '#fafafa',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.greenDark, marginBottom: '0.5rem' }}>
                      {label}
                    </div>

                    {existingMeal ? (
                      <>
                        {existingMeal.imageData && (
                          <img
                            src={existingMeal.imageData}
                            alt={label}
                            onClick={() => setMealPreviewImage(existingMeal.imageData)}
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: '0.4rem',
                            }}
                          />
                        )}
                        <div style={{ fontSize: '0.7rem', color: COLORS.textLight, textAlign: 'left' }}>
                          {existingMeal.foodItems.map((f: MealFoodItem, i: number) => (
                            <div key={i}>{f.name} ~{Math.round(f.estimated_calories)}kcal</div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.greenDark, marginTop: '0.3rem' }}>
                          {Math.round(existingMeal.totalCalories || 0)} kcal
                        </div>
                        <button
                          onClick={() => deleteMealRecord(existingMeal.id)}
                          style={{
                            position: 'absolute', top: '4px', right: '6px',
                            background: 'none', border: 'none', color: '#ccc',
                            cursor: 'pointer', fontSize: '0.7rem',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                        >
                          x
                        </button>
                      </>
                    ) : (
                      <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', height: '80px',
                        border: `2px dashed ${COLORS.greenLight}`, borderRadius: '8px',
                        cursor: (isUploading || isRecognizing) ? 'wait' : 'pointer',
                        color: COLORS.textLight, fontSize: '0.8rem',
                      }}>
                        {isRecognizing ? (
                          <span>AI 识别中...</span>
                        ) : isUploading ? (
                          <span>上传中...</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>+</span>
                            <span>拍照</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMealPhoto(key, file);
                            e.target.value = '';
                          }}
                          disabled={isUploading || isRecognizing}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      {/* AI 识别结果弹窗 */}
      <AnimatePresence>
        {recognizedFoods && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setRecognizedFoods(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: '16px', padding: '1.5rem',
                maxWidth: '450px', width: '90%', maxHeight: '80vh', overflow: 'auto',
              }}
            >
              <h3 style={{ margin: '0 0 1rem', color: COLORS.greenDark }}>
                {MEAL_TYPES.find(m => m.key === recognizedFoods.mealType)?.label} - AI 识别结果
              </h3>

              {recognizedFoods.imageData && (
                <img
                  src={recognizedFoods.imageData}
                  alt="餐食照片"
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }}
                />
              )}

              <div style={{ marginBottom: '1rem' }}>
                {recognizedFoods.foods.map((food, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0', borderBottom: `1px solid ${COLORS.greenLight}`,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{food.name}</div>
                      <div style={{ fontSize: '0.75rem', color: COLORS.textLight }}>
                        ~{food.estimated_amount}g / {Math.round(food.estimated_calories)} kcal
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAddToLibraryItem(food);
                        setAddToLibraryName(food.name);
                        setAddToLibraryCategory(food.category || 'other');
                        setAddToLibraryCalories(String(Math.round(food.estimated_calories)));
                      }}
                      style={{
                        background: COLORS.blueLight, border: `1px solid ${COLORS.blue}`,
                        borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem',
                        color: COLORS.blue, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      + 食物库
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: COLORS.greenDark, textAlign: 'center', marginBottom: '1rem' }}>
                总热量: {Math.round(recognizedFoods.totalCalories)} kcal
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setRecognizedFoods(null)}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '8px',
                    border: `1px solid ${COLORS.greenLight}`, background: '#fff',
                    cursor: 'pointer', fontSize: '0.9rem',
                  }}
                >
                  取消
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={saveMealRecord}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '8px',
                    border: 'none', background: COLORS.green, color: '#fff',
                    cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                  }}
                >
                  确认保存
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 添加到食物库弹窗 */}
      <AnimatePresence>
        {addToLibraryItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 1100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setAddToLibraryItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: '16px', padding: '1.5rem',
                maxWidth: '350px', width: '90%',
              }}
            >
              <h3 style={{ margin: '0 0 1rem', color: COLORS.greenDark }}>添加到私人食物库</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: COLORS.textLight }}>名称</label>
                  <input
                    value={addToLibraryName}
                    onChange={e => setAddToLibraryName(e.target.value)}
                    style={{
                      width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px',
                      border: `1px solid ${COLORS.greenLight}`, fontSize: '0.85rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: COLORS.textLight }}>分类</label>
                  <select
                    value={addToLibraryCategory}
                    onChange={e => setAddToLibraryCategory(e.target.value)}
                    style={{
                      width: '100%', padding: '0.4rem', borderRadius: '6px',
                      border: `1px solid ${COLORS.greenLight}`, fontSize: '0.85rem', outline: 'none',
                    }}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: COLORS.textLight }}>热量 (kcal/100g)</label>
                  <input
                    type="number"
                    value={addToLibraryCalories}
                    onChange={e => setAddToLibraryCalories(e.target.value)}
                    style={{
                      width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px',
                      border: `1px solid ${COLORS.greenLight}`, fontSize: '0.85rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setAddToLibraryItem(null)}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '8px',
                      border: `1px solid ${COLORS.greenLight}`, background: '#fff',
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    取消
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={addingToLibrary || !addToLibraryName}
                    onClick={handleAddToLibrary}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '8px',
                      border: 'none', background: COLORS.green, color: '#fff',
                      cursor: addingToLibrary ? 'wait' : 'pointer',
                      fontSize: '0.85rem', fontWeight: 600,
                      opacity: addingToLibrary ? 0.6 : 1,
                    }}
                  >
                    {addingToLibrary ? '添加中...' : '添加'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图片预览弹窗 */}
      <AnimatePresence>
        {mealPreviewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMealPreviewImage(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <img
              src={mealPreviewImage}
              alt="预览"
              style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: '8px' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </main>
  );
}
