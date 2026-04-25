'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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

const RISK_OPTIONS = [
  { value: 'red', label: '高风险' },
  { value: 'yellow', label: '中风险' },
  { value: 'blue', label: '低风险' },
];

interface OcrResult {
  name: string;
  ingredients: string[];
  riskLevel: string;
  riskLabel: string;
  interpretation: string;
}

const FormUI = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [ingredientsImageUrl, setIngredientsImageUrl] = useState('');
  const [ingredientsFile, setIngredientsFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const [editName, setEditName] = useState('');
  const [editRiskLevel, setEditRiskLevel] = useState('blue');
  const [editIngredients, setEditIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [copySuccess, setCopyStatus] = useState(false);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageUrl(URL.createObjectURL(file));
      setImageBase64(await fileToBase64(file));
    }
  };

  const handleIngredientsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIngredientsImageUrl(URL.createObjectURL(file));
      setIngredientsFile(file);
    }
  };

  const handleImageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const foodFile = fileInputRef.current?.files?.[0];
    if (!foodFile || !ingredientsFile) {
      alert('请确保两张图片都已上传');
      return;
    }

    setIsProcessing(true);
    setOcrProgress(0);
    setOcrStatus('正在上传图片进行 AI 解析...');
    setRawOcrText('');
    
    try {
      let finalIngredientsImage: Blob = ingredientsFile;

      // 如果有选中区域，则进行裁剪（为了让 AI 更聚焦）
      if (imgRef.current && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          const scaleX = image.naturalWidth / image.width;
          const scaleY = image.naturalHeight / image.height;
          
          canvas.width = completedCrop.width * scaleX;
          canvas.height = completedCrop.height * scaleY;

          ctx.drawImage(
            image, 
            completedCrop.x * scaleX, 
            completedCrop.y * scaleY, 
            canvas.width, 
            canvas.height, 
            0, 0, canvas.width, canvas.height
          );

          finalIngredientsImage = await new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
          });
        }
      }

      setOcrProgress(50);
      setOcrStatus('AI 正在深度识别中文配料...');

      const formData = new FormData();
      formData.append('image', foodFile);
      formData.append('ingredientsImage', finalIngredientsImage);

      const response = await fetch('/api/process-records', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '请求失败');

      setOcrResult(data);
      setEditName(data.name || '');
      setEditRiskLevel(data.riskLevel || 'blue');
      setEditIngredients(data.ingredients || []);
      setRawOcrText(data.ocrText || '');
      setSaveStatus('idle');
      setOcrProgress(100);
    } catch (error: any) {
      console.error('Processing failed:', error);
      alert(`解析失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !editIngredients.includes(trimmed)) {
      setEditIngredients([...editIngredients, trimmed]);
      setNewIngredient('');
    }
  };

  const splitAndAddIngredients = () => {
    if (!newIngredient.trim()) return;
    
    // 替换所有句号（中英文）为空，然后按“、”或逗号分割
    const cleaned = newIngredient.replace(/[。.]/g, '');
    const items = cleaned.split(/[、,]/).map(item => item.trim()).filter(item => item && !editIngredients.includes(item));
    
    if (items.length > 0) {
      setEditIngredients([...editIngredients, ...items]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setOcrResult(null);
    setImageUrl('');
    setImageBase64('');
    setIngredientsImageUrl('');
    setEditName('');
    setEditRiskLevel('blue');
    setEditIngredients([]);
    setNewIngredient('');
    setSaveStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!editName.trim() || editIngredients.length === 0) return;
    setSaveStatus('saving');
    const riskLabel = RISK_OPTIONS.find(o => o.value === editRiskLevel)?.label || '低风险';
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          ingredients: editIngredients,
          riskLevel: editRiskLevel,
          riskLabel,
          interpretation: ocrResult?.interpretation || '',
          imageData: imageBase64,
        }),
      });
      if (res.ok) {
        resetForm();
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  };

  const handleCopyOcr = async () => {
    try {
      await navigator.clipboard.writeText(rawOcrText);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
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
    <main style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.5rem 0',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>AI 食品助手</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: COLORS.textLight, marginRight: '0.5rem' }}>Hi, {username}</span>
          <button
            type="button"
            onClick={() => router.push('/knowledge')}
            style={{
              background: 'none',
              border: `1px solid ${COLORS.greenLight}`,
              borderRadius: '6px',
              padding: '0.4rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: 600,
              color: COLORS.greenDark,
            }}
          >
            知识库
          </button>
          <button
            type="button"
            onClick={() => router.push('/library')}
            style={{
              background: 'none',
              border: `1px solid ${COLORS.greenLight}`,
              borderRadius: '6px',
              padding: '0.4rem 1rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: 600,
              color: COLORS.text,
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
              padding: '0.4rem 1rem',
              fontSize: '0.9rem',
              color: COLORS.textLight,
              cursor: 'pointer',
            }}
          >
            退出
          </button>
        </div>
      </div>
      <div style={{ width: '100%' }}>
      <form
        onSubmit={handleImageSubmit}
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '2.5rem',
          border: `1px solid ${COLORS.greenLight}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.8rem', color: COLORS.greenDark }}>
            智能识别配料表
          </h2>
          <p style={{ margin: 0, color: COLORS.textLight, fontSize: '0.95rem' }}>
            上传图片，AI 助您解析成分风险
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* 左侧：食物图片 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: 600 }}>1. 上传食物正面图</span>
            {imageUrl && (
              <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: `2px solid ${COLORS.greenLight}`,
                boxShadow: '0 2px 8px rgba(126,207,95,0.2)',
                aspectRatio: '1/1',
              }}>
                <img src={imageUrl} alt="预览" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: imageUrl ? '0.6rem' : '1.5rem',
                borderRadius: '8px',
                border: `2px dashed ${COLORS.green}`,
                background: '#fff',
                cursor: 'pointer',
                color: COLORS.textLight,
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              <span>📷 {imageUrl ? '更换食物图' : '点击上传'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                name="image"
                required
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* 右侧：配料表图片 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: 600 }}>2. 上传配料表图 (可拖拽选中区域)</span>
            {ingredientsImageUrl && (
              <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: `2px solid ${COLORS.greenLight}`,
                boxShadow: '0 2px 8px rgba(126,207,95,0.2)',
                background: '#eee',
                position: 'relative',
              }}>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                >
                  <img
                    ref={imgRef}
                    src={ingredientsImageUrl}
                    alt="配料表预览"
                    style={{ width: '100%', display: 'block' }}
                  />
                </ReactCrop>
                {(!completedCrop || completedCrop.width === 0) && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    pointerEvents: 'none',
                  }}>
                    提示：在图上拖拽选中配料表区域识别更精准
                  </div>
                )}
              </div>
            )}
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: ingredientsImageUrl ? '0.6rem' : '1.5rem',
                borderRadius: '8px',
                border: `2px dashed ${COLORS.green}`,
                background: '#fff',
                cursor: 'pointer',
                color: COLORS.textLight,
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              <span>📄 {ingredientsImageUrl ? '更换配料表' : '点击上传'}</span>
              <input
                type="file"
                accept="image/*"
                name="ingredientsImage"
                required
                onChange={handleIngredientsFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing || !imageUrl || !ingredientsImageUrl}
          style={{
            padding: '0.75rem 1.5rem',
            background: COLORS.green,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: (isProcessing || !imageUrl || !ingredientsImageUrl) ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: (isProcessing || !imageUrl || !ingredientsImageUrl) ? 0.6 : 1,
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            if (!isProcessing && imageUrl && ingredientsImageUrl) {
              e.currentTarget.style.background = COLORS.greenDark;
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing && imageUrl && ingredientsImageUrl) {
              e.currentTarget.style.background = COLORS.green;
            }
          }}
        >
          {isProcessing && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${ocrProgress}%`,
              background: 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s ease',
            }} />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isProcessing ? ocrStatus : '开始智能解析'}
          </span>
        </button>

        {isProcessing && (
          <div style={{
            fontSize: '0.8rem',
            color: COLORS.textLight,
            textAlign: 'center',
            marginTop: '-0.5rem',
          }}>
            识别过程可能需要 10-20 秒，请耐心等待...
          </div>
        )}

        {rawOcrText && (
          <div style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: `1px solid #ddd`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: COLORS.text }}>OCR 识别结果原文：</span>
              <button 
                type="button" 
                onClick={handleCopyOcr}
                style={{ 
                  background: copySuccess ? COLORS.green : 'none', 
                  border: copySuccess ? 'none' : `1px solid ${COLORS.greenLight}`, 
                  color: copySuccess ? '#fff' : COLORS.greenDark, 
                  cursor: 'pointer', 
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {copySuccess ? '已复制！' : '一键复制'}
              </button>
            </div>
            <textarea
              readOnly
              value={rawOcrText}
              style={{
                width: '100%',
                height: '80px',
                fontSize: '0.85rem',
                border: 'none',
                background: 'transparent',
                color: COLORS.textLight,
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>
        )}

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
              {ocrResult.ingredients.length > 0 ? (
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
              ) : (
                <p style={{ fontSize: '0.85rem', color: COLORS.textLight, fontStyle: 'italic', marginTop: '0.5rem' }}>
                  未识别出高风险成分，请检查 OCR 文本并手动添加。
                </p>
              )}
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
            <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>风险等级</label>
            <select
              value={editRiskLevel}
              onChange={(e) => setEditRiskLevel(e.target.value)}
              style={{ ...inputStyle, marginTop: '0.35rem' }}
            >
              {RISK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
                placeholder="输入配料，如“水、白砂糖、柠檬酸”"
                style={inputStyle}
              />
              <button type="button" onClick={addIngredient} style={smallBtnStyle}>
                添加
              </button>
              <button 
                type="button" 
                onClick={splitAndAddIngredients} 
                style={{
                  ...smallBtnStyle,
                  background: COLORS.yellow,
                  color: COLORS.text,
                  fontWeight: 600
                }}
                title="按“、”自动分割并去句号"
              >
                智能分割
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !editName.trim() || editIngredients.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: COLORS.green,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              opacity: (!editName.trim() || editIngredients.length === 0) ? 0.5 : 1,
            }}
          >
            {saveStatus === 'saving' ? '保存中...' : '保存到数据库'}
          </button>

          {saveStatus === 'error' && (
            <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0 }}>保存失败，请重试</p>
          )}
        </div>
      )}
      </div>
    </main>
  );
};

export default FormUI;
