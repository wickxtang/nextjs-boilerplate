'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';

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

const CATEGORY_OPTIONS = [
    { value: 'grain', label: '谷薯类 (米面土豆)' },
    { value: 'vegetable', label: '蔬菜类' },
    { value: 'fruit', label: '水果类' },
    { value: 'meat_egg', label: '畜禽肉蛋类' },
    { value: 'aquatic', label: '水产品 (鱼虾贝)' },
    { value: 'dairy', label: '奶类及奶制品' },
    { value: 'soy_nut', label: '大豆及坚果类' },
    { value: 'snack', label: '零食/包装食品' },
    { value: 'drink', label: '饮料' },
    { value: 'other', label: '其他' },
  ];

interface Nutrition {
  energy_kj?: number;
  protein_g?: number;
  fat_g?: number;
  carbohydrate_g?: number;
  sodium_mg?: number;
}

interface OcrResult {
  name: string;
  category: string;
  ingredients: string[];
  nutrition: Nutrition;
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
  const [editCategory, setEditCategory] = useState('snack');
  const [editRiskLevel, setEditRiskLevel] = useState('blue');
  const [editIngredients, setEditIngredients] = useState<string[]>([]);
  const [editNutrition, setEditNutrition] = useState<any>({});
  const [editBrandName, setEditBrandName] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const [newIngredient, setNewIngredient] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [copySuccess, setCopyStatus] = useState(false);
  const [manualNameInput, setManualNameInput] = useState('');

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
    
    // 如果没有图片也没有手动输入名称，则报错
    if (!foodFile && !manualNameInput.trim()) {
      alert('请上传食物图片或输入食物名称');
      return;
    }

    setIsProcessing(true);
    setOcrProgress(0);
    setOcrStatus(manualNameInput && !foodFile ? '正在查询营养库...' : '正在上传图片进行 AI 解析...');
    setRawOcrText('');

    try {
      const formData = new FormData();
      if (foodFile) {
        formData.append('image', foodFile);
        
        let finalIngredientsImage: Blob = ingredientsFile || foodFile;

        // 如果有选中区域，则进行裁剪（为了让 AI 更聚焦）
        if (ingredientsFile && imgRef.current && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
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
        
        if (ingredientsFile) {
          formData.append('ingredientsImage', finalIngredientsImage);
        }
      }
      
      if (manualNameInput.trim()) {
        formData.append('manualName', manualNameInput.trim());
      }

      setOcrProgress(50);
      setOcrStatus(manualNameInput && !foodFile ? 'AI 正在分析营养价值...' : 'AI 正在深度识别成分与营养信息...');

      const response = await fetch('/api/process-records', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        const err = new Error(data.error || '请求失败') as any;
        err.suggestion = data.suggestion;
        err.detail = data.detail;
        throw err;
      }

      setOcrResult(data);
      setEditName(data.name || manualNameInput || '');
      setEditBrandName(data.brandName || '');
      setEditCategory(data.category || 'snack');
      setEditRiskLevel(data.riskLevel || 'blue');
      setEditIngredients(data.ingredients || []);
      setEditNutrition(data.nutrition || {});
      setServingSize(data.nutrition?.serving_size?.toString() || '100');
      setServingUnit(data.nutrition?.serving_unit || 'g');
      setRawOcrText(data.ocrText || '');
      setSaveStatus('idle');
      setOcrProgress(100);
    } catch (error: any) {
      console.error('Processing failed:', error);
      const errorMsg = error.message || '未知错误';
      const suggestion = error.suggestion ? `\n\n建议: ${error.suggestion}` : '';
      alert(`解析失败: ${errorMsg}${suggestion}${error.detail ? `\n\n详情: ${error.detail}` : ''}`);
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
    setEditCategory('snack');
    setEditRiskLevel('blue');
    setEditIngredients([]);
    setEditNutrition({});
    setNewIngredient('');
    setSaveStatus('idle');
    setManualNameInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualInput = () => {
    setEditName(manualNameInput || '');
    setEditBrandName('');
    setEditCategory('snack');
    setEditRiskLevel('blue');
    setEditIngredients([]);
    setEditNutrition({});
    setServingSize('100');
    setServingUnit('g');
    setOcrResult({ success: true } as any); // 触发编辑表单显示
    setOcrProgress(100);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    // 水果蔬菜允许配料表为空
    if (editCategory === 'snack' && editIngredients.length === 0) {
      alert('零食类食物请添加配料表');
      return;
    }

    setSaveStatus('saving');
    const riskLabel = RISK_OPTIONS.find(o => o.value === editRiskLevel)?.label || '低风险';
    try {
      const res = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          brandName: editBrandName.trim(),
          category: editCategory,
          ingredients: editIngredients,
          riskLevel: editRiskLevel,
          riskLabel,
          interpretation: ocrResult?.interpretation || '',
          imageData: imageBase64,
          nutrition: {
            ...editNutrition,
            serving_size: parseFloat(servingSize) || 100,
            serving_unit: servingUnit,
          },
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

  const updateNutrition = (field: keyof Nutrition, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setEditNutrition(prev => ({ ...prev, [field]: numValue }));
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.5rem 0',
        }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>AI 食品助手</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: COLORS.textLight, marginRight: '0.5rem' }}>Hi, {username}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.push('/stats')}
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
            分析
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, color: COLORS.green }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>
        </div>
      </motion.div>
      <div style={{ width: '100%' }}>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
              智能识别食物成分
            </h2>
            <p style={{ margin: 0, color: COLORS.textLight, fontSize: '0.95rem' }}>
              上传图片或输入名称，AI 助您解析成分风险与营养价值
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: 600 }}>1. 输入食物名称 (可选，有助于提高果蔬识别率)</span>
            <input
              type="text"
              placeholder="例如：红富士苹果、西兰花、乐事薯片..."
              value={manualNameInput}
              onChange={(e) => setManualNameInput(e.target.value)}
              style={{ ...inputStyle, padding: '0.75rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* 左侧：食物图片 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: 600 }}>2. 上传食物正面图 (可选)</span>
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
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* 右侧：配料表/营养成分图片 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: COLORS.text, fontWeight: 600 }}>3. 上传配料表/营养表 (可选)</span>
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
                      alt="详情预览"
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
                      提示：框选配料表或营养表区域识别更精准
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
                <span>📄 {ingredientsImageUrl ? '更换成分图' : '点击上传'}</span>
                <input
                  type="file"
                  accept="image/*"
                  name="ingredientsImage"
                  onChange={handleIngredientsFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={isProcessing || (!imageUrl && !manualNameInput.trim())}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                background: COLORS.green,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: (isProcessing || (!imageUrl && !manualNameInput.trim())) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: (isProcessing || (!imageUrl && !manualNameInput.trim())) ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden',
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
                {isProcessing ? ocrStatus : (manualNameInput && !imageUrl ? '仅按名称查询营养' : '开始智能解析')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleManualInput}
              disabled={isProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'none',
                color: COLORS.greenDark,
                border: `2px solid ${COLORS.green}`,
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              手动输入成分
            </button>
          </div>

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
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: COLORS.text }}>识别文本：</span>
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
                  height: '60px',
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
        </motion.form>

        <AnimatePresence>
          {ocrResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                marginTop: '1.25rem',
                background: '#fff',
                borderRadius: '12px',
                padding: '1.5rem',
                border: `2px solid ${COLORS.greenLight}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: COLORS.greenDark }}>
                确认并完善信息
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="食物全称"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ ...inputStyle, fontSize: '1rem', fontWeight: 600 }}
                />
                
                {/* 品牌名 - 仅非果蔬类显示 */}
                {editCategory !== 'fruit' && editCategory !== 'vegetable' && (
                  <input
                    type="text"
                    placeholder="品牌名称 (例如: 乐事, 农夫山泉)"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    style={{ ...inputStyle, fontSize: '0.9rem' }}
                  />
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={editRiskLevel}
                    onChange={(e) => setEditRiskLevel(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ 
                padding: '0.75rem', background: COLORS.bg, 
                borderRadius: '8px', fontSize: '0.85rem', color: COLORS.textLight,
                border: `1px solid ${COLORS.greenLight}`
              }}>
                <span style={{ fontWeight: 600, color: COLORS.text, marginRight: '0.5rem' }}>AI 解析:</span>
                {ocrResult.interpretation}
              </div>

              {/* 计量单位与营养成分 */}
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: COLORS.text }}>营养成分 (每)</span>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                    />
                    <select
                      value={servingUnit}
                      onChange={(e) => setServingUnit(e.target.value)}
                      style={{ ...inputStyle, width: '70px' }}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="杯">杯</option>
                      <option value="个">个</option>
                      <option value="片">片</option>
                      <option value="袋">袋</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: '能量(kJ)', field: 'energy_kj' },
                    { label: '蛋白(g)', field: 'protein_g' },
                    { label: '脂肪(g)', field: 'fat_g' },
                    { label: '碳水(g)', field: 'carbohydrate_g' },
                    { label: '钠(mg)', field: 'sodium_mg' }
                  ].map(item => (
                    <div key={item.field}>
                      <span style={{ fontSize: '0.65rem', color: COLORS.textLight, display: 'block', textAlign: 'center', marginBottom: '0.25rem' }}>{item.label}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editNutrition[item.field as keyof Nutrition] ?? ''}
                        onChange={(e) => updateNutrition(item.field as keyof Nutrition, e.target.value)}
                        style={{ ...inputStyle, textAlign: 'center', padding: '0.3rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 配料列表 - 仅零食类显示 */}
              {(editCategory === 'snack' || editCategory === 'other') && (
                <div>
                  <label style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 600 }}>配料清单</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {editIngredients.map((ing, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.2rem',
                        padding: '0.25rem 0.5rem', background: COLORS.bg,
                        borderRadius: '4px', border: `1px solid ${COLORS.greenLight}`,
                      }}>
                        <span style={{ fontSize: '0.85rem', color: COLORS.text }}>{ing}</span>
                        <button type="button" onClick={() => removeIngredient(idx)}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
                      placeholder="手动输入配料"
                      style={inputStyle}
                    />
                    <button type="button" onClick={splitAndAddIngredients} style={{ ...smallBtnStyle, background: COLORS.yellow, color: COLORS.text }}>
                      智能分割
                    </button>
                    <button type="button" onClick={addIngredient} style={smallBtnStyle}>
                      添加
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !editName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: COLORS.green,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                  opacity: (!editName.trim()) ? 0.5 : 1,
                }}
              >
                {saveStatus === 'saving' ? '保存中...' : '确认保存'}
              </button>

              {saveStatus === 'error' && (
                <p style={{ color: '#e74c3c', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>保存失败，请重试</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default FormUI;
