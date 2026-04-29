import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/app/lib/db';

interface TrendingIngredient {
  name: string;
  iarcLevel: string;
  riskLevel: string;
  totalCount: number;
  relatedSnacksCount: number;
  trend: 'up' | 'down' | 'stable';
}

// 配料风险等级映射（复用 health-insights 的逻辑）
const INGREDIENT_RISK: Record<string, { iarcLevel: string; riskLevel: string }> = {
  '亚硝酸钠': { iarcLevel: '1', riskLevel: 'red' },
  '硝酸钠': { iarcLevel: '1', riskLevel: 'red' },
  '黄曲霉毒素': { iarcLevel: '1', riskLevel: 'red' },
  '酒精': { iarcLevel: '1', riskLevel: 'red' },
  '乙醇': { iarcLevel: '1', riskLevel: 'red' },
  '丙烯酰胺': { iarcLevel: '2A', riskLevel: 'yellow' },
  '阿斯巴甜': { iarcLevel: '2B', riskLevel: 'yellow' },
  '糖精': { iarcLevel: '2B', riskLevel: 'yellow' },
  '焦糖色': { iarcLevel: '2B', riskLevel: 'yellow' },
  '氢化植物油': { iarcLevel: '3', riskLevel: 'yellow' },
  '植脂末': { iarcLevel: '3', riskLevel: 'yellow' },
  '果葡糖浆': { iarcLevel: '3', riskLevel: 'yellow' },
};

export async function GET() {
  try {
    // 查询最近30天全站高风险配料出现频率
    const currentMonth = await queryAll<{
      ingredient_name: string;
      total_count: number;
      snack_count: number;
    }>(`
      SELECT
        si.ingredient_name,
        COUNT(*) as total_count,
        COUNT(DISTINCT s.id) as snack_count
      FROM checkins c
      JOIN snacks s ON c.snack_id = s.id
      JOIN snack_ingredients si ON s.id = si.snack_id
      WHERE c.checkin_date >= date('now', '-30 days')
        AND si.ingredient_name IS NOT NULL
      GROUP BY si.ingredient_name
      ORDER BY total_count DESC
    `);

    // 查询上月数据用于计算趋势
    const lastMonth = await queryAll<{
      ingredient_name: string;
      total_count: number;
    }>(`
      SELECT
        si.ingredient_name,
        COUNT(*) as total_count
      FROM checkins c
      JOIN snacks s ON c.snack_id = s.id
      JOIN snack_ingredients si ON s.id = si.snack_id
      WHERE c.checkin_date >= date('now', '-60 days')
        AND c.checkin_date < date('now', '-30 days')
        AND si.ingredient_name IS NOT NULL
      GROUP BY si.ingredient_name
    `);

    const lastMonthMap = new Map(lastMonth.map(r => [r.ingredient_name, r.total_count]));

    // 过滤只保留高风险配料
    const ingredients: TrendingIngredient[] = currentMonth
      .filter(row => {
        const risk = INGREDIENT_RISK[row.ingredient_name];
        return risk && (risk.riskLevel === 'red' || risk.riskLevel === 'yellow');
      })
      .map(row => {
        const risk = INGREDIENT_RISK[row.ingredient_name];
        const lastCount = lastMonthMap.get(row.ingredient_name) || 0;
        const change = lastCount > 0
          ? ((row.total_count - lastCount) / lastCount) * 100
          : row.total_count > 0 ? 100 : 0;

        return {
          name: row.ingredient_name,
          iarcLevel: risk.iarcLevel,
          riskLevel: risk.riskLevel,
          totalCount: row.total_count,
          relatedSnacksCount: row.snack_count,
          trend: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
        };
      })
      .slice(0, 20);

    // 查询本周新增的高风险配料数
    const weeklyNew = await queryOne<{ count: number }>(`
      SELECT COUNT(DISTINCT si.ingredient_name) as count
      FROM checkins c
      JOIN snacks s ON c.snack_id = s.id
      JOIN snack_ingredients si ON s.id = si.snack_id
      WHERE c.checkin_date >= date('now', '-7 days')
        AND si.ingredient_name IN (${Object.keys(INGREDIENT_RISK).map(() => '?').join(',')})
    `, Object.keys(INGREDIENT_RISK));

    return NextResponse.json({
      ingredients,
      summary: {
        totalHighRiskIngredients: ingredients.length,
        weeklyNewCount: weeklyNew?.count || 0,
      },
    });
  } catch (error) {
    console.error('热搜榜数据查询失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
