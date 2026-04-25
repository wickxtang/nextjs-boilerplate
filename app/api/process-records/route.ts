import { NextRequest, NextResponse } from 'next/server';

// 模拟AI配料解析（实际项目中应调用DeepSeek/OpenAI API）
function mockParseIngredients(ocrText: string) {
  // 简单解析：假设OCR文本包含配料表，这里模拟返回结构化数据
  const sampleIngredients = [
    { name: '阿斯巴甜', standardName: '阿斯巴甜', aliases: ['甜味素', 'E951'], iarcLevel: '2B', description: '人工合成甜味剂，2B类致癌物（可能对人类致癌）' },
    { name: '柠檬酸', standardName: '柠檬酸', aliases: ['E330'], iarcLevel: '3', description: '天然存在于柑橘类水果中，安全' },
    { name: '苯甲酸钠', standardName: '苯甲酸钠', aliases: ['E211'], iarcLevel: '3', description: '常用防腐剂，在规定剂量内安全' },
  ];

  // 根据OCR文本简单匹配（演示用）
  const foundIngredients = sampleIngredients.filter(ing =>
    ocrText.toLowerCase().includes(ing.name.toLowerCase()) ||
    ocrText.toLowerCase().includes(ing.standardName.toLowerCase())
  );

  // 如果没有匹配，不返回默认示例，而是由 LLM 或 OCR 文本决定
  const ingredients = foundIngredients;

  // 风险评级
  const riskLevel = ingredients.some(i => i.iarcLevel === '1') ? 'red' :
                   ingredients.some(i => i.iarcLevel === '2A' || i.iarcLevel === '2B') ? 'yellow' : 'blue';

  const riskLabel = riskLevel === 'red' ? '高风险' : riskLevel === 'yellow' ? '中风险' : '低风险';

  const ingredientNames = ingredients.map(i => i.standardName);

  return {
    name: '识别结果',
    ingredients: ingredientNames,
    ingredientDetails: ingredients,
    riskLevel,
    riskLabel,
    interpretation: ingredientNames.length > 0 
      ? `含有${ingredientNames.join('、')}。${ingredients.some(i => i.iarcLevel === '2B') ? '含2B类致癌物，符合国标添加量。' : '配料相对安全。'}`
      : '未识别出高风险成分，请核对配料表。',
    recordTime: new Date().toISOString().split('T')[0]
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const ocrText = formData.get('ocrText') as string;

    if (!imageFile || !ocrText) {
      return NextResponse.json({ error: '请提供食物图片和 OCR 识别文本' }, { status: 400 });
    }

    console.log('接收到客户端 OCR 结果，开始直接匹配分析...');

    // 直接结合 OCR 文本进行解析匹配，不再调用 DeepSeek
    const parsedData = mockParseIngredients(ocrText);

    return NextResponse.json({
      success: true,
      ocrText: ocrText.substring(0, 500),
      ...parsedData,
    });

  } catch (error) {
    console.error('处理失败:', error);
    return NextResponse.json({ error: '处理请求时出错' }, { status: 500 });
  }
}
