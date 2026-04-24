'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = {
  green: '#7ecf5f',
  greenDark: '#5ba33d',
  greenLight: '#e8f5e0',
  yellow: '#f9d84d',
  yellowLight: '#fff9e0',
  bg: '#fafff5',
  text: '#3d4a2e',
  textLight: '#6b7a55',
};

interface OcrResult {
  name: string;
  ingredients: string[];
  riskLevel: string;
  riskLabel: string;
  interpretation: string;
}

const FormUI = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const [editName, setEditName] = useState('');
  const [editIngredients, setEditIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (!res.ok) {
        router.replace('/login');
        return;
      }
      return res.json();
    }).then(data => {
      if (data?.username) {
        setUsername(data.username);
        setAuthChecked(true);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  const handleImageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch('/api/process-records', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setOcrResult(data);
      setEditName(data.name || '');
      setEditIngredients(data.ingredients || []);
      setSaveStatus('idle');
    } catch (error) {
      console.error('OCR failed:', error);
    }
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !editIngredients.includes(trimmed)) {
      setEditIngredients([...editIngredients, trimmed]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!editName.trim() || editIngredients.length === 0) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          ingredients: editIngredients,
          riskLevel: ocrResult?.riskLevel || '',
          riskLabel: ocrResult?.riskLabel || '',
          interpretation: ocrResult?.interpretation || '',
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.greenLight}`,
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem',
    background: COLORS.green,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    flexShrink: 0,
  };

  if (!authChecked) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: COLORS.textLight }}>加载中...</div>;
  }

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.5rem 0',
      }}>
        <span style={{ fontSize: '0.9rem', color: COLORS.text }}>
          {username}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => router.push('/library')}
            style={{
              background: 'none',
              border: `1px solid ${COLORS.greenLight}`,
              borderRadius: '6px',
              padding: '0.3rem 0.75rem',
              fontSize: '0.8rem',
              color: COLORS.greenDark,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            食物库
          </button>
          <button
            type="button"
            onClick={handleLogout}
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
            退出登录
          </button>
        </div>
      </div>
      <form
        onSubmit={handleImageSubmit}
        style={{
          background: COLORS.bg,
          borderRadius: '12px',
          padding: '2rem',
          border: `2px solid ${COLORS.greenLight}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.greenDark, textAlign: 'center' }}>
          食品成分解析
        </h1>

        {imageUrl && (
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            border: `2px solid ${COLORS.greenLight}`,
            boxShadow: '0 2px 8px rgba(126,207,95,0.2)',
          }}>
            <img src={imageUrl} alt="预览" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '2rem 1rem',
            borderRadius: '8px',
            border: `2px dashed ${COLORS.green}`,
            background: '#fff',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            color: COLORS.textLight,
            fontSize: '0.9rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.greenDark)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.green)}
        >
          <span style={{ fontSize: '2rem' }}>📷</span>
          <span>{imageUrl ? '点击更换图片' : '点击或拖拽上传食品图片'}</span>
          <input
            type="file"
            accept="image/*"
            name="image"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setImageUrl(URL.createObjectURL(file));
            }}
            style={{ display: 'none' }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            background: COLORS.green,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.greenDark)}
          onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.green)}
        >
          提交解析
        </button>

        {ocrResult && (
          <div style={{
            marginTop: '0.5rem',
            padding: '1.25rem',
            background: '#fff',
            borderRadius: '8px',
            border: `1px solid ${COLORS.greenLight}`,
          }}>
            <h2 style={{ margin: '0 0 0.75rem', color: COLORS.text, fontSize: '1.15rem' }}>
              {ocrResult.name}
            </h2>

            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: COLORS.yellowLight,
              color: COLORS.text,
              border: `1px solid ${COLORS.yellow}`,
              marginBottom: '1rem',
            }}>
              风险等级：{ocrResult.riskLabel}
            </div>

            <p style={{ color: COLORS.textLight, lineHeight: 1.6, margin: '0 0 1rem' }}>
              {ocrResult.interpretation}
            </p>

            <div style={{ borderTop: `1px solid ${COLORS.greenLight}`, paddingTop: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: COLORS.text, fontSize: '0.9rem' }}>成分列表</span>
              <ul style={{
                margin: '0.5rem 0 0',
                padding: '0 0 0 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              }}>
                {ocrResult.ingredients.map((ingredient) => (
                  <li key={ingredient} style={{
                    color: COLORS.textLight,
                    fontSize: '0.9rem',
                    listStyle: 'none',
                    padding: '0.35rem 0.75rem',
                    background: COLORS.bg,
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.greenLight}`,
                  }}>
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </form>

      {ocrResult && (
        <div style={{
          marginTop: '1.25rem',
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          border: `2px solid ${COLORS.greenLight}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: COLORS.greenDark }}>
            编辑并保存
          </h3>

          <div>
            <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>食品名称</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ ...inputStyle, marginTop: '0.35rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>配料列表</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
              {editIngredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    flex: 1,
                    padding: '0.4rem 0.75rem',
                    background: COLORS.bg,
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.greenLight}`,
                    fontSize: '0.9rem',
                    color: COLORS.text,
                  }}>
                    {ing}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    style={{
                      ...smallBtnStyle,
                      background: '#e74c3c',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
                placeholder="输入配料名称"
                style={inputStyle}
              />
              <button type="button" onClick={addIngredient} style={smallBtnStyle}>
                添加
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !editName.trim() || editIngredients.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: saveStatus === 'saved' ? COLORS.greenDark : COLORS.green,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              opacity: (!editName.trim() || editIngredients.length === 0) ? 0.5 : 1,
            }}
          >
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存到数据库'}
          </button>

          {saveStatus === 'error' && (
            <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>保存失败，请重试</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FormUI;
