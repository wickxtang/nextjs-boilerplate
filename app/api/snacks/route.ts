import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/app/lib/db';
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
  const snacks = await queryAll<{
    id: number;
    user_id: number;
    name: string;
    category: string;
    risk_level: string;
    risk_label: string;
    interpretation: string;
    image_data: string | null;
    energy_kj: number | null;
    protein_g: number | null;
    fat_g: number | null;
    carbohydrate_g: number | null;
    sodium_mg: number | null;
    record_time: string;
    created_at: string;
    username: string;
  }>(query, params);

  const snackIds = snacks.map(s => s.id);
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

  const result = snacks.map(s => ({
    id: s.id,
    userId: s.user_id,
    name: s.name,
    category: s.category,
    riskLevel: s.risk_level,
    riskLabel: s.risk_label,
    interpretation: s.interpretation,
    imageData: s.image_data,
    nutrition: {
      energy_kj: s.energy_kj,
      protein_g: s.protein_g,
      fat_g: s.fat_g,
      carbohydrate_g: s.carbohydrate_g,
      sodium_mg: s.sodium_mg,
    },
    recordTime: s.record_time,
    createdAt: s.created_at,
    username: s.username,
    ingredients: ingredientsMap[s.id] || [],
  }));

  return NextResponse.json(result);
}
