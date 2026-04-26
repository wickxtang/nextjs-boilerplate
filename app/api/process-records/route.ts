import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 请在 .env 中设置 GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 模拟AI配料解析（用于补充 Gemini 结果中的详细信息）
function getIngredientDetails(ingredientNames: string[] = []) {
  if (!Array.isArray(ingredientNames)) return { ingredientDetails: [], riskLevel: 'blue', riskLabel: '低风险' };

  const sampleIngredients = [
    { name: '阿斯巴甜', standardName: '阿斯巴甜', aliases: ['甜味素', 'E951'], iarcLevel: '2B', description: '人工合成甜味剂，2B类致癌物（可能对人类致癌）' },
    { name: '柠檬酸', standardName: '柠檬酸', aliases: ['E330'], iarcLevel: '3', description: '天然存在于柑橘类水果中，安全' },
    { name: '苯甲酸钠', standardName: '苯甲酸钠', aliases: ['E211'], iarcLevel: '3', description: '常用防腐剂，在规定剂量内安全' },
  ];

  const details = sampleIngredients.filter(ing =>
    ingredientNames.some(name => typeof name === 'string' && (name.includes(ing.name) || ing.name.includes(name)))
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
    const imageFile = formData.get('image') as File | null;
    const ingredientsImageFile = formData.get('ingredientsImage') as File | null;
    const manualName = formData.get('manualName') as string | null;

    if (!imageFile && !manualName) {
      return NextResponse.json({ error: '请提供图片或手动输入名称' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: '未配置 GEMINI_API_KEY，请在 .env 中设置' }, { status: 500 });
    }

    // 收集所有可用图片
    const imageParts = [];

    // 限制图片大小和类型
    const processImage = async (file: File) => {
      // 限制 4MB
      if (file.size > 4 * 1024 * 1024) {
        throw new Error(`图片 "${file.name}" 太大 (超过 4MB)，请压缩后再试`);
      }
      const buffer = await file.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: file.type || 'image/jpeg',
        },
      };
    };

    if (imageFile) {
      imageParts.push(await processImage(imageFile));
    }

    if (ingredientsImageFile) {
      imageParts.push(await processImage(ingredientsImageFile));
    }

    // 调用 Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let prompt = '';
    if (manualName && !ingredientsImageFile) {
      // 场景一：名称优先查询（适用于果蔬或已知食品，仅有正面图或无图）
      prompt = `你是一个专业的食品营养专家。用户提供了一个食品名称：“${manualName}”${imageFile ? '，并附带了一张实物正面图片供参考' : ''}。
      请根据该名称（参考图片确认品种）提供该食品的标准化营养数据。
      
      要求：
      1. 必须提供每 100g/100ml 的平均营养数值，不能返回 null。
      2. 类别 (category) 必须是 'snack', 'fruit', 'vegetable', 'drink', 'other' 之一。
      3. 配料表 (ingredients) 对于天然果蔬应返回空数组 []。
      
      返回 JSON 格式：
      {
        "name": "规范的食品全称",
        "category": "snack|fruit|vegetable|drink|other",
        "ingredients": [],
        "nutrition": {
          "energy_kj": 能量数值(kJ),
          "protein_g": 蛋白质(g),
          "fat_g": 脂肪(g),
          "carbohydrate_g": 碳水(g),
          "sodium_mg": 钠(mg)
        },
        "ocrText": "基于名称“${manualName}”的百科查询结果"
      }
      直接输出 JSON，不要 Markdown 代码块包裹。`;
    } else {
      // 场景二：深度图片识别（适用于有配料表和营养表的包装食品）
      prompt = `你是一个专业的食品安全与营养分析专家。请分析上传的图片${manualName ? `（用户提示该食品可能是：“${manualName}”）` : ''}。
      
      任务：
      1. 识别并提取包装上的“配料表”文字，存入 ingredients 数组。
      2. 识别并提取“营养成分表”中每 100g/100ml 的数值。
      3. 如果图片模糊或缺失营养表，请结合食品名称“${manualName || '该食品'}”提供常识性估值。
      
      注意：
      - 仅提取数值，忽略单位。
      - 类别 (category) 必须是 'snack', 'fruit', 'vegetable', 'drink', 'other' 之一。
      
      返回 JSON 格式：
      {
        "name": "包装上的产品名称",
        "category": "snack|fruit|vegetable|drink|other",
        "ingredients": ["配料1", "配料2", ...],
        "nutrition": {
          "energy_kj": 能量,
          "protein_g": 蛋白质,
          "fat_g": 脂肪,
          "carbohydrate_g": 碳水,
          "sodium_mg": 钠
        },
        "ocrText": "提取到的原始文字片段"
      }
      直接输出 JSON。`;
    }

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();

    if (!text) {
      throw new Error('AI 返回内容为空，请重试');
    }

    let parsedResult;
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Raw AI response:', text);
        throw new Error('AI 返回数据格式不正确，无法解析');
      }
    }

    const analysis = getIngredientDetails(parsedResult.ingredients);

    return NextResponse.json({
      success: true,
      name: parsedResult.name || manualName || '识别结果',
      category: parsedResult.category || (manualName ? 'fruit' : 'snack'),
      ingredients: parsedResult.ingredients || [],
      nutrition: parsedResult.nutrition || {},
      ocrText: parsedResult.ocrText || '',
      interpretation: (parsedResult.ingredients && parsedResult.ingredients.length > 0)
        ? `识别到 ${parsedResult.ingredients.length} 种配料。${analysis.riskLevel === 'yellow' ? '发现潜在风险成分。' : '成分相对安全。'}`
        : '已根据常识提供营养成分参考。',
      ...analysis,
      recordTime: new Date().toISOString().split('T')[0]
    });

  } catch (error: any) {
    console.error('Gemini 处理失败:', error);

    let errorMessage = 'AI 处理请求时出错';
    let suggestion = '';

    // 针对网络连接错误的特殊处理
    if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = '网络连接失败：无法访问 Google AI 服务';
      suggestion = '请检查您的网络环境。如果您在受限网络下，请确保已配置系统代理或 VPN，并允许 Node.js 访问 googleapis.com。';
    } else if (error.message?.includes('API_KEY_INVALID')) {
      errorMessage = 'API Key 无效';
      suggestion = '请检查 .env 文件中的 GEMINI_API_KEY 是否配置正确。';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'AI 额度已耗尽';
      suggestion = '当前 API Key 的免费额度已用完，请稍后再试或更换 Key。';
    } else if (error.message?.includes('safety')) {
      errorMessage = '内容安全审核未通过';
      suggestion = '图片或文字内容触发了 AI 的安全过滤机制，请尝试更换图片。';
    } else {
      errorMessage = errorMessage;
      console.log(error.message);
    }

    return NextResponse.json({
      error: errorMessage,
      suggestion: suggestion,
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
