'use client';
import { useState } from 'react';

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
    <form onSubmit={handleImageSubmit} className="flex flex-col gap-4" style={{ maxWidth: '400px' }}>
      {/* 预览 */}
      {imageUrl && <img src={imageUrl} alt="预览" style={{ maxWidth: '100%' }} />}
      <input
        type="file"
        accept="image/*"
        name="image"
        required
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setImageUrl(URL.createObjectURL(file));
        }}
      />
      <button
        type="submit"
        style={{
          padding: '0.5rem 1rem',
          background: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        提交解析
      </button>
      {ocrResult && (
        <div style={{ marginTop: '1rem' }}>
          <h2>{ocrResult.name}</h2>
          <p style={{ margin: '0.5rem 0' }}>
            风险等级：<strong>{ocrResult.riskLabel}</strong>
          </p>
          <p>{ocrResult.interpretation}</p>
          <ul>
            {ocrResult.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
};

export default FormUI;
