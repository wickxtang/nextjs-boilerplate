'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ECharts } from 'echarts';

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
  riskLevel: string;
  riskLabel: string;
  interpretation: string;
  imageData: string | null;
  recordTime: string;
  username: string;
  ingredients: string[];
}

interface EditState {
  name: string;
  riskLevel: string;
  ingredients: string[];
  newIngredient: string;
  imageData: string | null;
  imageChanged: boolean;
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
  const [editState, setEditState] = useState<EditState>({ name: '', riskLevel: 'blue', ingredients: [], newIngredient: '', imageData: null, imageChanged: false });
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

  const startEdit = (snack: Snack) => {
    setEditingId(snack.id);
    setEditState({ name: snack.name, riskLevel: snack.riskLevel, ingredients: [...snack.ingredients], newIngredient: '', imageData: snack.imageData, imageChanged: false });
  };

  const cancelEdit = () => setEditingId(null);

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
    if (!editState.name.trim() || editState.ingredients.length === 0 || editingId === null) return;
    setSaving(true);
    const riskLabel = RISK_OPTIONS.find(o => o.value === editState.riskLevel)?.label || '低风险';
    const payload: Record<string, unknown> = {
      name: editState.name.trim(),
      ingredients: editState.ingredients,
      riskLevel: editState.riskLevel,
      riskLabel,
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
        ? { ...s, name: editState.name.trim(), riskLevel: editState.riskLevel, riskLabel, ingredients: editState.ingredients, ...(editState.imageChanged ? { imageData: editState.imageData } : {}) }
        : s
      ));
      setEditingId(null);
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
    if (snacks.length === 0) {
      return (
        <p style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}>
          {tab === 'mine' ? '还没有记录，去首页添加一条吧' : '暂无记录'}
        </p>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        {snacks.map(snack => {
          const riskColor = RISK_COLORS[snack.riskLevel] || RISK_COLORS.blue;
          const isOwner = snack.userId === currentUserId;
          const isEditing = editingId === snack.id;

          if (isEditing) {
            return (
              <div key={snack.id} style={{
                gridColumn: '1 / -1',
                background: '#fff', borderRadius: '10px', padding: '1rem 1.25rem',
                border: `2px solid ${COLORS.green}`, display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <label style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                    {editState.imageData ? (
                      <img src={editState.imageData} alt="预览" style={{
                        width: '64px', height: '64px', objectFit: 'cover',
                        borderRadius: '8px', border: `2px dashed ${COLORS.green}`,
                      }} />
                    ) : (
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '8px',
                        border: `2px dashed ${COLORS.green}`, background: COLORS.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                      }}>📷</div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.45)', color: '#fff',
                      fontSize: '0.6rem', textAlign: 'center',
                      borderRadius: '0 0 6px 6px', padding: '1px 0',
                    }}>换图</div>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setEditState(s => ({ ...s, imageData: reader.result as string, imageChanged: true }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input type="text" value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} style={inputStyle} />
                    <select value={editState.riskLevel} onChange={e => setEditState(s => ({ ...s, riskLevel: e.target.value }))} style={inputStyle}>
                      {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.8rem', color: COLORS.text, fontWeight: 600 }}>配料</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}>
                    {editState.ingredients.map((ing, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          flex: 1, padding: '0.3rem 0.6rem', background: COLORS.bg,
                          borderRadius: '4px', border: `1px solid ${COLORS.greenLight}`,
                          fontSize: '0.82rem', color: COLORS.text,
                        }}>{ing}</span>
                        <button type="button" onClick={() => removeEditIngredient(idx)}
                          style={{ ...smallBtnStyle, background: COLORS.red, fontSize: '0.75rem' }}>删除</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <input type="text" value={editState.newIngredient}
                      onChange={e => setEditState(s => ({ ...s, newIngredient: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditIngredient(); } }}
                      placeholder="添加配料" style={inputStyle} />
                    <button type="button" onClick={addEditIngredient} style={smallBtnStyle}>添加</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={cancelEdit} style={{
                    ...smallBtnStyle, background: 'transparent', color: COLORS.textLight,
                    border: `1px solid ${COLORS.greenLight}`,
                  }}>取消</button>
                  <button type="button" onClick={handleSaveEdit} disabled={saving || !editState.name.trim() || editState.ingredients.length === 0}
                    style={{ ...smallBtnStyle, opacity: (!editState.name.trim() || editState.ingredients.length === 0) ? 0.5 : 1 }}>
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={snack.id} style={{
              background: '#fff', borderRadius: '10px', padding: '1rem 1.25rem',
              border: `1px solid ${COLORS.greenLight}`,
            }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {snack.imageData && (
                  <div style={{ display: 'grid', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <img src={snack.imageData} alt={snack.name} style={{
                      width: '64px', height: '64px', objectFit: 'cover',
                      borderRadius: '8px', border: `1px solid ${COLORS.greenLight}`, flexShrink: 0,
                    }} />
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      background: riskColor.bg, color: COLORS.text, border: `1px solid ${riskColor.border}`,
                    }}>{snack.riskLabel}
                    </span>
                  </div>

                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span 
                          title={snack.name}
                          style={{ fontWeight: 600, fontSize: '1rem', color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}
                        >
                          {snack.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.textLight, marginBottom: '0.5rem' }}>
                        {snack.username} · {snack.recordTime}
                      </div>
                    </div>
                    {isOwner && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        <button onClick={() => startEdit(snack)} style={{
                          background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.4rem',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.color = COLORS.greenDark)}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                        >编辑</button>
                        <button onClick={() => handleDelete(snack.id)} style={{
                          background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.4rem',
                        }}
                          onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                        >删除</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {snack.ingredients.map(renderIngredientTag)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.5rem 0' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>{username || '食物库'}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => router.push('/knowledge')}
            style={{
              background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px',
              padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.greenDark, cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            知识库
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px',
              padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            首页
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.greenLight}`, marginBottom: '1rem' }}>
        <button onClick={() => { setTab('mine'); setEditingId(null); }} style={tabStyle(tab === 'mine')}>我的食物库</button>
        <button onClick={() => { setTab('all'); setEditingId(null); }} style={tabStyle(tab === 'all')}>所有食物库</button>
        <button onClick={() => { setTab('graph'); setEditingId(null); }} style={tabStyle(tab === 'graph')}>配料图谱</button>
      </div>

      {tab === 'graph' ? (
        <div>
          <div ref={chartRef} style={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px', background: '#fff', borderRadius: '10px', border: `1px solid ${COLORS.greenLight}` }} />
          <p style={{ fontSize: '0.78rem', color: COLORS.textLight, textAlign: 'center', marginTop: '0.5rem' }}>
            点击配料节点查看详情 · 拖拽移动节点 · 滚轮缩放
          </p>
        </div>
      ) : renderListView()}
    </main>
  );
}
