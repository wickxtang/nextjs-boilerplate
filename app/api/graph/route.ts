import { NextResponse } from 'next/server';
import { queryAll } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const snacks = await queryAll<{ id: number; name: string; risk_level: string }>(
    `SELECT s.id, s.name, s.risk_level FROM snacks s WHERE s.user_id = ? ORDER BY s.created_at DESC`,
    [user.userId]
  );

  const snackIds = snacks.map(s => s.id);
  if (snackIds.length === 0) {
    return NextResponse.json({ nodes: [], links: [] });
  }

  const placeholders = snackIds.map(() => '?').join(',');
  const ingredients = await queryAll<{ snack_id: number; ingredient_name: string }>(
    `SELECT snack_id, ingredient_name FROM snack_ingredients WHERE snack_id IN (${placeholders})`,
    snackIds
  );

  const nodes: Array<{ id: string; name: string; category: number; symbolSize: number; riskLevel?: string }> = [];
  const links: Array<{ source: string; target: string }> = [];
  const ingredientSet = new Set<string>();

  for (const s of snacks) {
    nodes.push({
      id: `snack-${s.id}`,
      name: s.name,
      category: 0,
      symbolSize: 40,
      riskLevel: s.risk_level,
    });
  }

  for (const ing of ingredients) {
    if (!ingredientSet.has(ing.ingredient_name)) {
      ingredientSet.add(ing.ingredient_name);
      nodes.push({
        id: `ing-${ing.ingredient_name}`,
        name: ing.ingredient_name,
        category: 1,
        symbolSize: 28,
      });
    }
    links.push({
      source: `snack-${ing.snack_id}`,
      target: `ing-${ing.ingredient_name}`,
    });
  }

  return NextResponse.json({ nodes, links });
}
