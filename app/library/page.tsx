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

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', riskLevel: 'blue', ingredients: [], newIngredient: '', imageData: null, imageChanged: false });
  const [saving, setSaving] = useState(false);

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
    if (res.ok) setSnacks(await res.json());
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (currentUserId !== null) fetchSnacks();
  }, [currentUserId, fetchSnacks]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条记录吗？')) return;
    const res = await fetch(`/api/snacks/${id}`, { method: 'DELETE' });
    if (res.ok) setSnacks(prev => prev.filter(s => s.id !== id));
  };

  const startEdit = (snack: Snack) => {
    setEditingId(snack.id);
    setEditState({ name: snack.name, riskLevel: snack.riskLevel, ingredients: [...snack.ingredients], newIngredient: '', imageData: snack.imageData, imageChanged: false });
  };

  const cancelEdit = () => {
    setEditingId(null);
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
        <button onClick={() => { setTab('mine'); setEditingId(null); }} style={tabStyle(tab === 'mine')}>我的食物库</button>
        <button onClick={() => { setTab('all'); setEditingId(null); }} style={tabStyle(tab === 'all')}>所有食物库</button>
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
            const isEditing = editingId === snack.id;

            if (isEditing) {
              return (
                <div key={snack.id} style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  border: `2px solid ${COLORS.green}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
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
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem',
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
                      <input
                        type="text"
                        value={editState.name}
                        onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                        style={inputStyle}
                      />
                      <select
                        value={editState.riskLevel}
                        onChange={e => setEditState(s => ({ ...s, riskLevel: e.target.value }))}
                        style={inputStyle}
                      >
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
                      <input
                        type="text"
                        value={editState.newIngredient}
                        onChange={e => setEditState(s => ({ ...s, newIngredient: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditIngredient(); } }}
                        placeholder="添加配料"
                        style={inputStyle}
                      />
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
                background: '#fff',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                border: `1px solid ${COLORS.greenLight}`,
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {snack.imageData && (
                    <img src={snack.imageData} alt={snack.name} style={{
                      width: '64px', height: '64px', objectFit: 'cover',
                      borderRadius: '8px', border: `1px solid ${COLORS.greenLight}`, flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: COLORS.text }}>{snack.name}</span>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                            background: riskColor.bg, color: COLORS.text, border: `1px solid ${riskColor.border}`,
                          }}>{snack.riskLabel}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: COLORS.textLight, marginBottom: '0.5rem' }}>
                          {snack.username} · {snack.recordTime}
                        </div>
                      </div>
                      {isOwner && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
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
                      {snack.ingredients.map((ing, i) => (
                        <span key={i} style={{
                          padding: '0.2rem 0.5rem', background: COLORS.bg, borderRadius: '4px',
                          fontSize: '0.78rem', color: COLORS.text, border: `1px solid ${COLORS.greenLight}`,
                        }}>{ing}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
