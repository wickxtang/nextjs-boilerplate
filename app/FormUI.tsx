'use client';
import { useState } from 'react';

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

const FormUI = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [ocrResult, setOcrResult] = useState(null);

  const handleImageSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const response = await fetch('/api/process-records', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setOcrResult(data);
    } catch (error) {
      console.error('OCR failed:', error);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
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

        {/* 预览 */}
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
    </div>
  );
};

export default FormUI;
