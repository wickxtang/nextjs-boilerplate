import { NextRequest, NextResponse } from 'next/server';
import { execute, queryAll } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

// 获取用户的打卡记录
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const checkins = await queryAll<{
    id: number;
    snack_id: number;
    checkin_date: string;
    name: string;
    risk_level: string;
  }>(`
    SELECT c.*, s.name, s.risk_level 
    FROM checkins c 
    JOIN snacks s ON c.snack_id = s.id 
    WHERE c.user_id = ? 
    ORDER BY c.checkin_date DESC, c.created_at DESC
  `, [user.userId]);

  // 获取这些零食的配料信息
  const snackIds = Array.from(new Set(checkins.map(c => c.snack_id)));
  let ingredientsMap: Record<number, string[]> = {};

  if (snackIds.length > 0) {
    const placeholders = snackIds.map(() => '?').join(',');
    const ingredients = await queryAll<{ snack_id: number; ingredient_name: string }>(
      `SELECT snack_id, ingredient_name FROM snack_ingredients WHERE snack_id IN (${placeholders})`,
      snackIds
    );

    for (const ing of ingredients) {
      if (!ingredientsMap[ing.snack_id]) ingredientsMap[ing.snack_id] = [];
      ingredientsMap[ing.snack_id].push(ing.ingredient_name);
    }
  }

  const result = checkins.map(c => ({
    id: c.id,
    snackId: c.snack_id,
    date: c.checkin_date,
    name: c.name,
    riskLevel: c.risk_level,
    ingredients: ingredientsMap[c.snack_id] || [],
  }));

  return NextResponse.json(result);
}

// 执行打卡
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  try {
    const { snackId, date } = await request.json();
    if (!snackId) return NextResponse.json({ error: '未提供食物ID' }, { status: 400 });

    // 如果未提供日期，默认使用服务器当前本地日期 (YYYY-MM-DD)
    const checkinDate = date || new Date().toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD

    await execute(
      `INSERT INTO checkins (user_id, snack_id, checkin_date) VALUES (?, ?, ?)`,
      [user.userId, snackId, checkinDate]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('打卡失败:', error);
    return NextResponse.json({ error: '打卡请求处理失败' }, { status: 500 });
  }
}
