import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 请在 .env 中设置 GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 模拟AI配料解析（用于补充 Gemini 结果中的详细信息）
function getIngredientDetails(ingredientNames: string[]) {
  const sampleIngredients = [
    { name: '阿斯巴甜', standardName: '阿斯巴甜', aliases: ['甜味素', 'E951'], iarcLevel: '2B', description: '人工合成甜味剂，2B类致癌物（可能对人类致癌）' },
    { name: '柠檬酸', standardName: '柠檬酸', aliases: ['E330'], iarcLevel: '3', description: '天然存在于柑橘类水果中，安全' },
    { name: '苯甲酸钠', standardName: '苯甲酸钠', aliases: ['E211'], iarcLevel: '3', description: '常用防腐剂，在规定剂量内安全' },
  ];

  const details = sampleIngredients.filter(ing => 
    ingredientNames.some(name => name.includes(ing.name) || ing.name.includes(name))
  );

  const riskLevel = details.some(i => i.iarcLevel === '1') ? 'red' :
                   details.some(i => i.iarcLevel === '2A' || i.iarcLevel === '2B') ? 'yellow' : 'blue';

  const riskLabel = riskLevel === 'red' ? '高风险' : riskLevel === 'yellow' ? '中风险' : '低风险';

  return {
    ingredientDetails: details,
    riskLevel,
    riskLabel,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const ingredientsImageFile = formData.get('ingredientsImage') as File;

    if (!imageFile || !ingredientsImageFile) {
      return NextResponse.json({ error: '请提供图片' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: '未配置 GEMINI_API_KEY，请在 .env 中设置' }, { status: 500 });
    }

    // 将图片转换为 Gemini 需要的格式
    const imageBuffer = await ingredientsImageFile.arrayBuffer();
    const imageParts = [
      {
        inlineData: {
          data: Buffer.from(imageBuffer).toString('base64'),
          mimeType: ingredientsImageFile.type,
        },
      },
    ];

    // 调用 Gemini 1.5 Flash
    // 强制使用最新的 gemini-1.5-flash 完整名称
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest" 
    });
    const prompt = `你是一个专业的食品配料表分析专家。请识别图片中的配料表文字，并提取出所有的配料名称。
    注意：
    1. 仅提取配料名称，去除含量百分比。
    2. 如果图片中有干扰文字，请忽略，只关注配料表部分。
    3. 返回 JSON 格式：{"ingredients": ["配料1", "配料2", ...], "ocrText": "识别到的原始完整文本"}
    4. 必须只返回 JSON，不要有其他解释说明。`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // 解析 JSON
    let parsedResult = { ingredients: [], ocrText: '' };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Gemini 返回解析失败:', text);
      return NextResponse.json({ error: 'AI 解析返回格式错误' }, { status: 500 });
    }

    // 结合本地风险库进行分析
    const analysis = getIngredientDetails(parsedResult.ingredients);

    return NextResponse.json({
      success: true,
      name: '识别结果',
      ingredients: parsedResult.ingredients,
      ocrText: parsedResult.ocrText,
      interpretation: parsedResult.ingredients.length > 0 
        ? `Gemini 识别到 ${parsedResult.ingredients.length} 种配料。${analysis.riskLevel === 'yellow' ? '发现潜在风险成分，建议核对。' : '成分相对安全。'}`
        : '未能识别出明确的配料，请尝试重新框选或拍照。',
      ...analysis,
      recordTime: new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Gemini 处理失败:', error);
    return NextResponse.json({ error: 'AI 处理请求时出错' }, { status: 500 });
  }
}
