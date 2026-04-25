'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ECharts } from 'echarts';
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

const RISK_COLORS: Record<string, { bg: string; border: string }> = {
  red: { bg: COLORS.redLight, border: COLORS.red },
  yellow: { bg: COLORS.yellowLight, border: COLORS.yellow },
  blue: { bg: COLORS.blueLight, border: COLORS.blue },
};

const RISK_OPTIONS = [
  { value: 'red', label: '高风险' },
  { value: 'yellow', label: '中风险' },
  { value: 'blue', label: '低风险' },
];

interface Snack {
  id: number;
  userId: number;
  name: string;
  category: string;
  riskLevel: string;
  riskLabel: string;
  interpretation: string;
  imageData: string | null;
  recordTime: string;
  username: string;
  ingredients: string[];
  nutrition: {
    energy_kj: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbohydrate_g: number | null;
    sodium_mg: number | null;
  };
}

interface EditState {
  name: string;
  category: string;
  riskLevel: string;
  ingredients: string[];
  newIngredient: string;
  imageData: string | null;
  imageChanged: boolean;
  nutrition: {
    energy_kj?: number;
    protein_g?: number;
    fat_g?: number;
    carbohydrate_g?: number;
    sodium_mg?: number;
  };
}

interface GraphNode {
  id: string;
  name: string;
  category: number;
  symbolSize: number;
  riskLevel?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'all' | 'graph'>('mine');
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editState, setEditState] = useState<EditState>({ 
    name: '', 
    category: 'snack',
    riskLevel: 'blue', 
    ingredients: [], 
    newIngredient: '', 
    imageData: null, 
    imageChanged: false,
    nutrition: {}
  });

  const CATEGORY_OPTIONS = [
    { value: 'snack', label: '零食/包装食品' },
    { value: 'fruit', label: '水果' },
    { value: 'vegetable', label: '蔬菜' },
    { value: 'other', label: '其他' },
  ];
  const [saving, setSaving] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) { router.replace('/login'); return; }
      return res.json();
    }).then(data => {
      if (data?.userId) {
        setCurrentUserId(data.userId);
        setUsername(data.username);
      }
    });
  }, [router]);

  const fetchSnacks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/snacks?scope=${tab === 'graph' ? 'mine' : tab}`);
    if (res.ok) setSnacks(await res.json());
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (currentUserId !== null && tab !== 'graph') fetchSnacks();
  }, [currentUserId, fetchSnacks, tab]);

  useEffect(() => {
    if (tab !== 'graph' || currentUserId === null) return;

    const loadGraph = async () => {
      const res = await fetch('/api/graph');
      if (!res.ok) return;
      const { nodes, links } = await res.json();

      if (!chartRef.current) return;
      if (chartInstance.current) chartInstance.current.dispose();

      const echarts = await import('echarts');
      const chart = echarts.init(chartRef.current);
      chartInstance.current = chart;

      const riskNodeColors: Record<string, string> = {
        red: COLORS.red,
        yellow: COLORS.yellow,
        blue: COLORS.blue,
      };

      chart.setOption({
        tooltip: {
          formatter: (p: { data: GraphNode }) => p.data.name,
        },
        legend: {
          data: ['零食', '配料'],
          top: 10,
          textStyle: { color: COLORS.text, fontSize: 13 },
        },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          categories: [
            { name: '零食', itemStyle: { color: COLORS.green } },
            { name: '配料', itemStyle: { color: '#f0a050' } },
          ],
          data: nodes.map((n: GraphNode) => ({
            ...n,
            itemStyle: n.category === 0 ? { color: riskNodeColors[n.riskLevel || 'blue'] || COLORS.green } : undefined,
            label: { show: true, fontSize: 11, color: COLORS.text },
          })),
          links,
          force: {
            repulsion: 600,
            edgeLength: [150, 300],
            gravity: 0.04,
          },
          lineStyle: { color: '#ccc', width: 1.5, curveness: 0.1 },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 3 },
          },
        }],
      });

      chart.on('click', (params) => {
        const d = params.data as GraphNode | undefined;
        if (!d) return;
        if (d.category === 1) {
          router.push(`/ingredient/${encodeURIComponent(d.name)}`);
        }
      });

      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
        chartInstance.current = null;
      };
    };

    loadGraph();
  }, [tab, currentUserId, router]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条记录吗？')) return;
    const res = await fetch(`/api/snacks/${id}`, { method: 'DELETE' });
    if (res.ok) setSnacks(prev => prev.filter(s => s.id !== id));
  };

  const handleCheckin = async (snackId: number) => {
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snackId }),
    });
    if (res.ok) {
      alert('打卡成功！已记录到今日食用清单。');
    } else {
      alert('打卡失败，请重试');
    }
  };

  const startEdit = (snack: Snack) => {
    setEditingId(snack.id);
    setEditState({ 
      name: snack.name, 
      category: snack.category || 'snack',
      riskLevel: snack.riskLevel, 
      ingredients: [...snack.ingredients], 
      newIngredient: '', 
      imageData: snack.imageData, 
      imageChanged: false,
      nutrition: {
        energy_kj: snack.nutrition.energy_kj ?? undefined,
        protein_g: snack.nutrition.protein_g ?? undefined,
        fat_g: snack.nutrition.fat_g ?? undefined,
        carbohydrate_g: snack.nutrition.carbohydrate_g ?? undefined,
        sodium_mg: snack.nutrition.sodium_mg ?? undefined,
      }
    });
  };

  const cancelEdit = () => setEditingId(null);

  const updateEditNutrition = (field: keyof EditState['nutrition'], value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setEditState(prev => ({ 
      ...prev, 
      nutrition: { ...prev.nutrition, [field]: numValue } 
    }));
  };

  const addEditIngredient = () => {
    const trimmed = editState.newIngredient.trim();
    if (trimmed && !editState.ingredients.includes(trimmed)) {
      setEditState(s => ({ ...s, ingredients: [...s.ingredients, trimmed], newIngredient: '' }));
    }
  };

  const removeEditIngredient = (idx: number) => {
    setEditState(s => ({ ...s, ingredients: s.ingredients.filter((_, i) => i !== idx) }));
  };

  const handleSaveEdit = async () => {
    if (!editState.name.trim() || editingId === null) return;
    
    // 零食类必须有配料
    if (editState.category === 'snack' && editState.ingredients.length === 0) {
      alert('零食类食物请添加配料表');
      return;
    }

    setSaving(true);
    const riskLabel = RISK_OPTIONS.find(o => o.value === editState.riskLevel)?.label || '低风险';
    const payload: Record<string, unknown> = {
      name: editState.name.trim(),
      category: editState.category,
      ingredients: editState.ingredients,
      riskLevel: editState.riskLevel,
      riskLabel,
      nutrition: editState.nutrition,
    };
    if (editState.imageChanged) payload.imageData = editState.imageData;
    const res = await fetch(`/api/snacks/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setSnacks(prev => prev.map(s => s.id === editingId
        ? { 
            ...s, 
            name: editState.name.trim(), 
            category: editState.category,
            riskLevel: editState.riskLevel, 
            riskLabel, 
            ingredients: editState.ingredients, 
            nutrition: {
              energy_kj: editState.nutrition.energy_kj ?? null,
              protein_g: editState.nutrition.protein_g ?? null,
              fat_g: editState.nutrition.fat_g ?? null,
              carbohydrate_g: editState.nutrition.carbohydrate_g ?? null,
              sodium_mg: editState.nutrition.sodium_mg ?? null,
            },
            ...(editState.imageChanged ? { imageData: editState.imageData } : {}) 
          }
        : s
      ));
      setEditingId(null);
    }
  };

  const filteredSnacks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return snacks;
    return snacks.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.ingredients.some(ing => ing.toLowerCase().includes(query))
    );
  }, [snacks, searchQuery]);

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

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.65rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.greenLight}`,
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '0.3rem 0.6rem',
    background: COLORS.green,
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const renderIngredientTag = (ing: string, i: number) => (
    <span
      key={i}
      onClick={() => router.push(`/ingredient/${encodeURIComponent(ing)}`)}
      style={{
        padding: '0.2rem 0.5rem', background: COLORS.bg, borderRadius: '4px',
        fontSize: '0.78rem', color: COLORS.greenDark, border: `1px solid ${COLORS.greenLight}`,
        cursor: 'pointer', textDecoration: 'underline', textDecorationColor: COLORS.greenLight,
      }}
    >{ing}</span>
  );

  const renderListView = () => {
    if (loading) {
      return <p style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}>加载中...</p>;
    }

    return (
      <>
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <input
            type="text"
            placeholder="搜索食物名称或配料..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...inputStyle,
              padding: '0.7rem 1rem',
              paddingLeft: '2.8rem',
              fontSize: '0.95rem',
              border: `1px solid ${COLORS.greenLight}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderRadius: '10px',
            }}
          />
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.6 }}>🔍</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: COLORS.textLight, cursor: 'pointer', fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          )}
        </div>

        {filteredSnacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: '12px', border: `1px dashed ${COLORS.greenLight}` }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍃</div>
            <p style={{ color: COLORS.textLight, margin: 0, fontSize: '0.95rem' }}>
              {searchQuery ? `未找到与 "${searchQuery}" 相关的食物` : (tab === 'mine' ? '你还没有记录过食物哦，快去首页扫码添加吧' : '暂无食物记录')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {filteredSnacks.map(snack => {
              const riskColor = RISK_COLORS[snack.riskLevel] || RISK_COLORS.blue;
              const isOwner = snack.userId === currentUserId;
              const isEditing = editingId === snack.id;

              if (isEditing) {
                return (
                  <div key={snack.id} style={{
                    gridColumn: '1 / -1',
                    background: '#fff', borderRadius: '12px', padding: '1.25rem',
                    border: `2px solid ${COLORS.green}`, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <label style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                        {editState.imageData ? (
                          <img src={editState.imageData} alt="预览" style={{
                            width: '80px', height: '80px', objectFit: 'cover',
                            borderRadius: '10px', border: `2px dashed ${COLORS.green}`,
                          }} />
                        ) : (
                          <div style={{
                            width: '80px', height: '80px', borderRadius: '10px',
                            border: `2px dashed ${COLORS.green}`, background: COLORS.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                          }}>📷</div>
                        )}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setEditState(s => ({ ...s, imageData: reader.result as string, imageChanged: true }));
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" placeholder="食物名称" value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} style={{ ...inputStyle, flex: 2, fontSize: '1rem', fontWeight: 600 }} />
                          <select value={editState.category} onChange={e => setEditState(s => ({ ...s, category: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <select value={editState.riskLevel} onChange={e => setEditState(s => ({ ...s, riskLevel: e.target.value }))} style={inputStyle}>
                          {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* 营养成分编辑 */}
                    <div>
                      <span style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 700 }}>营养成分 (每 100g/ml)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {[
                          { label: '能量(kJ)', field: 'energy_kj' },
                          { label: '蛋白(g)', field: 'protein_g' },
                          { label: '脂肪(g)', field: 'fat_g' },
                          { label: '碳水(g)', field: 'carbohydrate_g' },
                          { label: '钠(mg)', field: 'sodium_mg' }
                        ].map(item => (
                          <div key={item.field}>
                            <span style={{ fontSize: '0.65rem', color: COLORS.textLight, display: 'block', textAlign: 'center' }}>{item.label}</span>
                            <input
                              type="number"
                              step="0.1"
                              value={editState.nutrition[item.field as keyof EditState['nutrition']] ?? ''}
                              onChange={(e) => updateEditNutrition(item.field as keyof EditState['nutrition'], e.target.value)}
                              style={{ ...inputStyle, textAlign: 'center', padding: '0.3rem' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 配料编辑 - 仅零食类显示 */}
                    {(editState.category === 'snack' || editState.category === 'other') && (
                      <div>
                        <span style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 700 }}>配料清单</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {editState.ingredients.map((ing, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', alignItems: 'center', gap: '0.2rem',
                              padding: '0.25rem 0.5rem', background: COLORS.bg,
                              borderRadius: '6px', border: `1px solid ${COLORS.greenLight}`,
                            }}>
                              <span style={{ fontSize: '0.85rem', color: COLORS.text }}>{ing}</span>
                              <button type="button" onClick={() => removeEditIngredient(idx)}
                                style={{ background: 'none', border: 'none', color: COLORS.red, cursor: 'pointer', padding: '0 2px', fontSize: '1rem', fontWeight: 700 }}>×</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <input type="text" value={editState.newIngredient}
                            onChange={e => setEditState(s => ({ ...s, newIngredient: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditIngredient(); } }}
                            placeholder="添加配料..." style={inputStyle} />
                          <button type="button" onClick={addEditIngredient} style={smallBtnStyle}>添加</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button type="button" onClick={cancelEdit} style={{
                        padding: '0.5rem 1.25rem', background: 'none', color: COLORS.textLight,
                        border: `1px solid ${COLORS.greenLight}`, borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem'
                      }}>取消</button>
                      <button type="button" onClick={handleSaveEdit} disabled={saving || !editState.name.trim()}
                        style={{ 
                          padding: '0.5rem 1.5rem', background: COLORS.green, color: '#fff',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                          opacity: (saving || !editState.name.trim()) ? 0.5 : 1 
                        }}>
                        {saving ? '保存中...' : '保存修改'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <motion.div 
                  layout
                  key={snack.id} 
                  style={{
                    background: '#fff', borderRadius: '12px', padding: '1rem',
                    border: `1px solid ${COLORS.greenLight}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {snack.imageData && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                        <img src={snack.imageData} alt={snack.name} style={{
                          width: '72px', height: '72px', objectFit: 'cover',
                          borderRadius: '10px', border: `1px solid ${COLORS.greenLight}`,
                        }} />
                        <span style={{
                          textAlign: 'center', padding: '0.15rem 0', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                          background: riskColor.bg, color: COLORS.text, border: `1px solid ${riskColor.border}`,
                        }}>{snack.riskLabel}
                        </span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span 
                              title={snack.name}
                              style={{ fontWeight: 700, fontSize: '1.05rem', color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {snack.name}
                            </span>
                            <span style={{ 
                              fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', 
                              background: COLORS.greenLight, color: COLORS.greenDark, fontWeight: 600 
                            }}>
                              {CATEGORY_OPTIONS.find(o => o.value === (snack.category || 'snack'))?.label || snack.category || '零食/包装食品'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: COLORS.textLight, marginTop: '0.2rem' }}>
                            {snack.username} · {snack.recordTime}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCheckin(snack.id)} style={{ ...smallBtnStyle, padding: '0.25rem 0.5rem', background: COLORS.greenLight, color: COLORS.greenDark, fontWeight: 700 }}>打卡</motion.button>
                          {isOwner && (
                            <div style={{ position: 'relative' }}>
                               <button onClick={() => startEdit(snack)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }} title="编辑">✎</button>
                               <button onClick={() => handleDelete(snack.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }} title="删除">×</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 营养成分展示 */}
                      {Object.values(snack.nutrition).some(v => v !== null && v !== undefined) && (
                        <div style={{ 
                          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', 
                          gap: '0.2rem', marginTop: '0.6rem', padding: '0.4rem',
                          background: '#f9fafb', borderRadius: '6px'
                        }}>
                          {[
                            { label: '能', value: snack.nutrition.energy_kj, unit: '' },
                            { label: '蛋', value: snack.nutrition.protein_g, unit: 'g' },
                            { label: '脂', value: snack.nutrition.fat_g, unit: 'g' },
                            { label: '碳', value: snack.nutrition.carbohydrate_g, unit: 'g' },
                            { label: '钠', value: snack.nutrition.sodium_mg, unit: 'mg' }
                          ].map((n, idx) => (
                            <div key={idx} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6rem', color: COLORS.textLight }}>{n.label}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: COLORS.text }}>
                                {n.value !== null && n.value !== undefined ? `${n.value}${n.unit}` : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
                        {snack.ingredients.slice(0, 6).map(renderIngredientTag)}
                        {snack.ingredients.length > 6 && <span style={{ fontSize: '0.7rem', color: COLORS.textLight, alignSelf: 'center' }}>...</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <main style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.5rem 0' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>{username || '食物库'}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/stats')} style={{ background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.greenDark, cursor: 'pointer', fontWeight: 600 }}>健康分析</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/knowledge')} style={{ background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.greenDark, cursor: 'pointer', fontWeight: 600 }}>知识库</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push('/')} style={{ background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer', fontWeight: 600 }}>首页</motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.greenLight}`, marginBottom: '1.25rem' }}>
        <button onClick={() => { setTab('mine'); setEditingId(null); setSearchQuery(''); }} style={tabStyle(tab === 'mine')}>我的食物库</button>
        <button onClick={() => { setTab('all'); setEditingId(null); setSearchQuery(''); }} style={tabStyle(tab === 'all')}>所有食物库</button>
        <button onClick={() => { setTab('graph'); setEditingId(null); setSearchQuery(''); }} style={tabStyle(tab === 'graph')}>配料图谱</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'graph' ? (
            <div>
              <div ref={chartRef} style={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px', background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.greenLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
              <p style={{ fontSize: '0.78rem', color: COLORS.textLight, textAlign: 'center', marginTop: '0.75rem' }}>
                💡 点击配料节点查看详情 · 拖拽移动节点 · 滚轮缩放
              </p>
            </div>
          ) : renderListView()}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
