import { NextRequest, NextResponse } from 'next/server';
// DeepSeek API integration – replace OCR with LLM parsing
const DEEPSEEK_API_KEY = 'sk-566c7659bef8478982295c4439014eb3';

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

  // 如果没有匹配，返回默认示例
  const ingredients = foundIngredients.length > 0 ? foundIngredients : sampleIngredients.slice(0, 2);

  // 风险评级
  const riskLevel = ingredients.some(i => i.iarcLevel === '1') ? 'red' :
                   ingredients.some(i => i.iarcLevel === '2A' || i.iarcLevel === '2B') ? 'yellow' : 'blue';

  const riskLabel = riskLevel === 'red' ? '高风险' : riskLevel === 'yellow' ? '中风险' : '低风险';

  return {
    name: '识别零食（可编辑）',
    ingredients: ingredients.map(i => i.standardName),
    ingredientDetails: ingredients,
    riskLevel,
    riskLabel,
    interpretation: `含有${ingredients.map(i => i.standardName).join('、')}。${ingredients.some(i => i.iarcLevel === '2B') ? '含2B类致癌物，符合国标添加量。' : '配料相对安全。'}`,
    recordTime: new Date().toISOString().split('T')[0]
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '未提供图片' }, { status: 400 });
    }

    // 将File转换为ArrayBuffer（保留以便后续可能的OCR实现）
    const arrayBuffer = await imageFile.arrayBuffer();
    // 这里直接使用空的 OCR 文本进行演示（实际项目请集成 OCR 或 Vision API）
    const ocrText = '';
    console.log('模拟 OCR，返回空文本');

    // 使用 DeepSeek LLM 进行配料解析（示例实现）
    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是配料表解析助手。根据提供的配料文本（仅中文配料名称）返回 JSON，格式：{ingredients: string[]}' },
          { role: 'user', content: `配料表文本：${ocrText}` },
        ],
        temperature: 0.2,
      }),
    });
    const deepData = await deepSeekResponse.json();
    // deepData.choices[0].message.content 应为 JSON 字符串
    let extractedIngredients: string[] = [];
    try {
      const parsed = JSON.parse(deepData.choices?.[0]?.message?.content || '{}');
      extractedIngredients = parsed.ingredients || [];
    } catch (e) {
      console.error('DeepSeek 解析出错', e);
    }

    // 结合提取的配料进行模拟解析（若未得到配料则使用空字符串）
    const parsedData = mockParseIngredients(extractedIngredients.join('、'));


    return NextResponse.json({
      success: true,
      ocrText: ocrText.substring(0, 200) + '...', // 返回部分OCR文本
      ...parsedData
    });

  } catch (error) {
    console.error('处理失败:', error);
    return NextResponse.json({ error: '处理图片时出错' }, { status: 500 });
  }
}
