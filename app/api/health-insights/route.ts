import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 配料知识库（IARC 分级）
const INGREDIENT_KNOWLEDGE: Record<string, { iarcLevel: string; category: string; description: string }> = {
  '阿斯巴甜': { iarcLevel: '2B', category: 'sweetener', description: '人工合成甜味剂，2B类致癌物' },
  '安赛蜜': { iarcLevel: '3', category: 'sweetener', description: '人工合成甜味剂，安全性尚可' },
  '三氯蔗糖': { iarcLevel: '3', category: 'sweetener', description: '人工合成甜味剂' },
  '甜蜜素': { iarcLevel: '3', category: 'sweetener', description: '人工合成甜味剂' },
  '糖精': { iarcLevel: '2B', category: 'sweetener', description: '早期人工甜味剂，2B类致癌物' },
  '苯甲酸钠': { iarcLevel: '3', category: 'preservative', description: '常用防腐剂' },
  '山梨酸钾': { iarcLevel: '3', category: 'preservative', description: '常用防腐剂，安全性较好' },
  '亚硝酸钠': { iarcLevel: '1', category: 'preservative', description: '腌肉防腐剂，1类致癌物' },
  '硝酸钠': { iarcLevel: '1', category: 'preservative', description: '腌肉防腐剂，1类致癌物' },
  '柠檬酸': { iarcLevel: '3', category: 'acidulant', description: '天然酸度调节剂' },
  '日落黄': { iarcLevel: '3', category: 'colorant', description: '人工合成色素' },
  '柠檬黄': { iarcLevel: '3', category: 'colorant', description: '人工合成色素' },
  '胭脂红': { iarcLevel: '3', category: 'colorant', description: '人工合成色素' },
  '亮蓝': { iarcLevel: '3', category: 'colorant', description: '人工合成色素' },
  '焦糖色': { iarcLevel: '2B', category: 'colorant', description: '可能含4-MEI，2B类致癌物' },
  '味精': { iarcLevel: '3', category: 'flavor enhancer', description: '谷氨酸钠，安全性尚可' },
  '呈味核苷酸二钠': { iarcLevel: '3', category: 'flavor enhancer', description: '增味剂' },
  '卡拉胶': { iarcLevel: '3', category: 'thickener', description: '增稠剂' },
  '果葡糖浆': { iarcLevel: '3', category: 'sweetener', description: '高果糖浆，过量摄入不利健康' },
  '氢化植物油': { iarcLevel: '3', category: 'fat', description: '可能含反式脂肪酸' },
  '植脂末': { iarcLevel: '3', category: 'fat', description: '可能含反式脂肪酸' },
  '丙烯酰胺': { iarcLevel: '2A', category: 'contaminant', description: '高温油炸产生，2A类致癌物' },
  '黄曲霉毒素': { iarcLevel: '1', category: 'contaminant', description: '1类致癌物' },
  '酒精': { iarcLevel: '1', category: 'other', description: '1类致癌物' },
  '乙醇': { iarcLevel: '1', category: 'other', description: '1类致癌物' },
};

// 获取配料风险等级
function getIngredientRisk(ingredientName: string): { iarcLevel: string; riskLevel: string } {
  const knowledge = INGREDIENT_KNOWLEDGE[ingredientName];
  if (!knowledge) return { iarcLevel: 'unknown', riskLevel: 'blue' };

  const { iarcLevel } = knowledge;
  if (iarcLevel === '1') return { iarcLevel, riskLevel: 'red' };
  if (iarcLevel === '2A' || iarcLevel === '2B') return { iarcLevel, riskLevel: 'yellow' };
  return { iarcLevel, riskLevel: 'blue' };
}

// 计算连续天数
function getConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...new Set(dates)].sort().reverse();
  let count = 1;
  const today = new Date().toLocaleDateString('en-CA');

  // 从最近一天开始计算连续天数
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diff = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

// 生成预警数据
async function generateWarnings(userId: number) {
  // 查询最近30天的打卡记录，关联配料
  const recentCheckins = await queryAll<{
    checkin_date: string;
    snack_id: number;
    snack_name: string;
    ingredient_name: string;
    amount: number;
  }>(`
    SELECT
      c.checkin_date,
      c.snack_id,
      s.name as snack_name,
      si.ingredient_name,
      c.amount
    FROM checkins c
    JOIN snacks s ON c.snack_id = s.id
    LEFT JOIN snack_ingredients si ON s.id = si.snack_id
    WHERE c.user_id = ?
      AND c.checkin_date >= date('now', '-30 days')
    ORDER BY c.checkin_date DESC
  `, [userId]);

  // 统计每个配料的出现频率和连续天数
  const ingredientStats: Record<string, {
    dates: Set<string>;
    count: number;
    snacks: Set<string>;
  }> = {};

  for (const row of recentCheckins) {
    if (!row.ingredient_name) continue;

    if (!ingredientStats[row.ingredient_name]) {
      ingredientStats[row.ingredient_name] = {
        dates: new Set(),
        count: 0,
        snacks: new Set(),
      };
    }

    ingredientStats[row.ingredient_name].dates.add(row.checkin_date);
    ingredientStats[row.ingredient_name].count++;
    ingredientStats[row.ingredient_name].snacks.add(row.snack_name);
  }

  // 生成预警：连续3天以上摄入的高风险配料
  const warnings = [];

  for (const [ingredient, stats] of Object.entries(ingredientStats)) {
    const { iarcLevel, riskLevel } = getIngredientRisk(ingredient);
    const consecutiveDays = getConsecutiveDays([...stats.dates]);

    // 高风险配料连续3天，或中风险配料连续5天
    if ((riskLevel === 'red' && consecutiveDays >= 3) ||
        (riskLevel === 'yellow' && consecutiveDays >= 5) ||
        (stats.count >= 10)) { // 30天内出现10次以上

      warnings.push({
        ingredient,
        iarcLevel,
        riskLevel,
        consecutiveDays,
        totalCount: stats.count,
        relatedSnacks: [...stats.snacks].slice(0, 3),
        message: riskLevel === 'red'
          ? `⚠️ 您已连续${consecutiveDays}天摄入含有"${ingredient}"（${iarcLevel}类致癌物）的食品`
          : `⚡ 您近30天内${stats.count}次摄入含有"${ingredient}"的食品`,
      });
    }
  }

  // 按风险等级排序
  warnings.sort((a, b) => {
    const riskOrder = { red: 0, yellow: 1, blue: 2 };
    return (riskOrder[a.riskLevel as keyof typeof riskOrder] || 2) -
           (riskOrder[b.riskLevel as keyof typeof riskOrder] || 2);
  });

  return warnings.slice(0, 5); // 最多返回5条预警
}

// 生成趋势数据
async function generateTrends(userId: number) {
  // 查询本月和上月的配料摄入统计
  const currentMonth = await queryAll<{ ingredient_name: string; count: number }>(`
    SELECT
      si.ingredient_name,
      COUNT(*) as count
    FROM checkins c
    JOIN snacks s ON c.snack_id = s.id
    JOIN snack_ingredients si ON s.id = si.snack_id
    WHERE c.user_id = ?
      AND c.checkin_date >= date('now', 'start of month')
      AND si.ingredient_name IS NOT NULL
    GROUP BY si.ingredient_name
    ORDER BY count DESC
    LIMIT 20
  `, [userId]);

  const lastMonth = await queryAll<{ ingredient_name: string; count: number }>(`
    SELECT
      si.ingredient_name,
      COUNT(*) as count
    FROM checkins c
    JOIN snacks s ON c.snack_id = s.id
    JOIN snack_ingredients si ON s.id = si.snack_id
    WHERE c.user_id = ?
      AND c.checkin_date >= date('now', 'start of month', '-1 month')
      AND c.checkin_date < date('now', 'start of month')
      AND si.ingredient_name IS NOT NULL
    GROUP BY si.ingredient_name
    ORDER BY count DESC
    LIMIT 20
  `, [userId]);

  // 构建趋势数据
  const lastMonthMap = new Map(lastMonth.map(r => [r.ingredient_name, r.count]));

  const trends = currentMonth.map(current => {
    const lastCount = lastMonthMap.get(current.ingredient_name) || 0;
    const change = lastCount > 0
      ? Math.round(((current.count - lastCount) / lastCount) * 100)
      : current.count > 0 ? 100 : 0;

    const { iarcLevel, riskLevel } = getIngredientRisk(current.ingredient_name);

    return {
      ingredient: current.ingredient_name,
      currentCount: current.count,
      lastCount,
      change,
      iarcLevel,
      riskLevel,
      trend: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
    };
  });

  // 按变化幅度排序，取变化最大的
  trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return {
    currentMonth: trends.slice(0, 10),
    summary: {
      totalIngredientsCurrent: currentMonth.length,
      totalIngredientsLast: lastMonth.length,
    },
  };
}

// 生成个人风险画像
async function generateRiskProfile(userId: number) {
  // 统计所有配料的风险分布
  const ingredientStats = await queryAll<{
    ingredient_name: string;
    count: number;
  }>(`
    SELECT
      si.ingredient_name,
      COUNT(*) as count
    FROM checkins c
    JOIN snacks s ON c.snack_id = s.id
    JOIN snack_ingredients si ON s.id = si.snack_id
    WHERE c.user_id = ?
      AND si.ingredient_name IS NOT NULL
    GROUP BY si.ingredient_name
    ORDER BY count DESC
  `, [userId]);

  // 分类统计
  const riskDistribution = {
    red: { count: 0, ingredients: [] as string[] },
    yellow: { count: 0, ingredients: [] as string[] },
    blue: { count: 0, ingredients: [] as string[] },
  };

  const topRiskIngredients: Array<{
    name: string;
    count: number;
    iarcLevel: string;
    riskLevel: string;
  }> = [];

  for (const stat of ingredientStats) {
    const { iarcLevel, riskLevel } = getIngredientRisk(stat.ingredient_name);

    riskDistribution[riskLevel as keyof typeof riskDistribution].count += stat.count;
    if (!riskDistribution[riskLevel as keyof typeof riskDistribution].ingredients.includes(stat.ingredient_name)) {
      riskDistribution[riskLevel as keyof typeof riskDistribution].ingredients.push(stat.ingredient_name);
    }

    if (riskLevel === 'red' || riskLevel === 'yellow') {
      topRiskIngredients.push({
        name: stat.ingredient_name,
        count: stat.count,
        iarcLevel,
        riskLevel,
      });
    }
  }

  // 计算风险评分（0-100，越低越好）
  const total = ingredientStats.reduce((sum, s) => sum + s.count, 0);
  const riskScore = total > 0
    ? Math.round(((riskDistribution.red.count * 3 + riskDistribution.yellow.count * 1) / total) * 33)
    : 0;

  return {
    riskScore: Math.min(riskScore, 100),
    riskDistribution,
    topRiskIngredients: topRiskIngredients.slice(0, 5),
    totalCheckins: total,
    uniqueIngredients: ingredientStats.length,
  };
}

// 调用 AI 生成解读
async function generateAIInterpretation(data: {
  warnings: any[];
  trends: any;
  profile: any;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return '未配置 AI 服务，无法生成个性化解读。';
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "text/plain" },
    });

    const prompt = `你是一个专业的健康饮食顾问。请根据以下用户的食品摄入数据，生成一份简洁的个性化健康洞察报告。

                    用户数据：
                    1. 预警信息：${JSON.stringify(data.warnings, null, 2)}
                    2. 成分趋势：${JSON.stringify(data.trends.currentMonth?.slice(0, 5), null, 2)}
                    3. 风险画像：风险评分 ${data.profile.riskScore}/100，高风险成分 ${data.profile.topRiskIngredients?.length || 0} 种

                    要求：
                    - 使用中文
                    - 语气友好、专业
                    - 重点突出最需要关注的问题
                    - 给出具体可行的建议
                    - 控制在200字以内
                    - 不要使用 Markdown 格式`;

    const result = await model.generateContent(prompt);
    console.info('AI 解读生成:', result);
    return result.response.text() || '暂无 AI 解读';
  } catch (error) {
    console.error('AI 解读生成失败:', error);
    return 'AI 解读生成失败，请稍后再试。';
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查缓存（1天内有效）
    const cache = await queryOne<{
      id: number;
      content: string;
      computed_at: string;
    }>(`
      SELECT id, content, computed_at
      FROM health_insights
      WHERE user_id = ? AND insight_type = 'all'
        AND computed_at >= datetime('now', '-1 day')
      ORDER BY computed_at DESC
      LIMIT 1
    `, [user.userId]);

    // if (cache) {
    //   return NextResponse.json({
    //     success: true,
    //     cached: true,
    //     computedAt: cache.computed_at,
    //     ...JSON.parse(cache.content),
    //   });
    // }

    // 生成新数据
    const [warnings, trends, profile] = await Promise.all([
      generateWarnings(user.userId),
      generateTrends(user.userId),
      generateRiskProfile(user.userId),
    ]);

    // 生成 AI 解读
    const aiInterpretation = await generateAIInterpretation({ warnings, trends, profile });

    const result = {
      warnings,
      trends,
      profile,
      aiInterpretation,
    };

    // 缓存结果
    await execute(
      `INSERT INTO health_insights (user_id, insight_type, content) VALUES (?, 'all', ?)`,
      [user.userId, JSON.stringify(result)]
    );

    // 清理旧缓存（保留最近5条）
    await execute(`
      DELETE FROM health_insights
      WHERE user_id = ? AND insight_type = 'all'
        AND id NOT IN (
          SELECT id FROM health_insights
          WHERE user_id = ? AND insight_type = 'all'
          ORDER BY computed_at DESC
          LIMIT 5
        )
    `, [user.userId, user.userId]);

    return NextResponse.json({
      success: true,
      cached: false,
      computedAt: new Date().toISOString(),
      ...result,
    });

  } catch (error: any) {
    console.error('健康洞察生成失败:', error);
    return NextResponse.json({
      error: '生成健康洞察失败',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}
