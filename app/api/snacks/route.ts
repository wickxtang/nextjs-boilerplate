import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get('scope') || 'mine';

  const query = scope === 'mine'
    ? `SELECT s.*, u.username FROM snacks s JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.created_at DESC`
    : `SELECT s.*, u.username FROM snacks s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC`;

  const params = scope === 'mine' ? [user.userId] : [];
  const snacks = db.prepare(query).all(...params) as Array<{
    id: number;
    user_id: number;
    name: string;
    risk_level: string;
    risk_label: string;
    interpretation: string;
    image_data: string | null;
    record_time: string;
    created_at: string;
    username: string;
  }>;

  const snackIds = snacks.map(s => s.id);
  let ingredientsMap: Record<number, string[]> = {};

  if (snackIds.length > 0) {
    const placeholders = snackIds.map(() => '?').join(',');
    const ingredients = db.prepare(
      `SELECT snack_id, ingredient_name FROM snack_ingredients WHERE snack_id IN (${placeholders})`
    ).all(...snackIds) as Array<{ snack_id: number; ingredient_name: string }>;

    for (const ing of ingredients) {
      if (!ingredientsMap[ing.snack_id]) ingredientsMap[ing.snack_id] = [];
      ingredientsMap[ing.snack_id].push(ing.ingredient_name);
    }
  }

  const result = snacks.map(s => ({
    id: s.id,
    userId: s.user_id,
    name: s.name,
    riskLevel: s.risk_level,
    riskLabel: s.risk_label,
    interpretation: s.interpretation,
    imageData: s.image_data,
    recordTime: s.record_time,
    createdAt: s.created_at,
    username: s.username,
    ingredients: ingredientsMap[s.id] || [],
  }));

  return NextResponse.json(result);
}
