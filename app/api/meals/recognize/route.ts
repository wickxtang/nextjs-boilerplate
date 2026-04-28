import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCurrentUser } from '@/app/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: '请提供餐食照片' }, { status: 400 });
    }

    if (imageFile.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: '图片太大（超过 4MB），请压缩后再试' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: '未配置 GEMINI_API_KEY' }, { status: 500 });
    }

    const buffer = await imageFile.arrayBuffer();
    const imagePart = {
      inlineData: {
        data: Buffer.from(buffer).toString('base64'),
        mimeType: imageFile.type || 'image/jpeg',
      },
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `你是一个专业的食品营养分析专家。请分析这张餐食照片，识别出照片中所有可见的食物。

任务：
1. 识别照片中的每一种食物/菜品
2. 估算每种食物的大致重量（克）
3. 估算每种食物的热量（千卡/kcal）
4. 判断食物类别

类别选项：
- 'grain': 谷薯类（米饭、面条、馒头、土豆等）
- 'vegetable': 蔬菜类
- 'fruit': 水果类
- 'meat_egg': 畜禽肉蛋类
- 'aquatic': 水产品
- 'dairy': 奶类及奶制品
- 'soy_nut': 大豆及坚果类
- 'snack': 零食/包装食品
- 'drink': 饮料
- 'other': 其他

返回 JSON 格式：
{
  "food_items": [
    {
      "name": "食物名称",
      "category": "类别",
      "estimated_amount": 估算重量(g),
      "estimated_calories": 估算热量(kcal),
      "energy_kj": 估算能量(kJ)
    }
  ],
  "total_calories": 总热量(kcal)
}

注意：
- 尽量准确识别每种食物
- 热量估算基于常见做法和标准分量
- energy_kj = estimated_calories * 4.184
- 如果无法识别某些食物，使用"未知食物"作为名称并给出粗略估算
直接输出 JSON。`;

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();

    if (!text) {
      throw new Error('AI 返回内容为空');
    }

    let parsedResult;
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 返回数据格式不正确');
      }
    }

    return NextResponse.json({
      success: true,
      food_items: parsedResult.food_items || [],
      total_calories: parsedResult.total_calories || 0,
    });
  } catch (error: any) {
    console.error('三餐识别失败:', error);

    let errorMessage = 'AI 处理请求时出错';
    if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
      errorMessage = '网络连接失败：无法访问 Google AI 服务';
    } else if (error.message?.includes('API_KEY_INVALID')) {
      errorMessage = 'API Key 无效';
    } else if (error.message?.includes('safety')) {
      errorMessage = '图片触发了安全过滤，请尝试更换图片';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
