import { NextRequest, NextResponse } from 'next/server';
import { execute, batch } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { 
    name, 
    category,
    ingredients, 
    riskLevel, 
    riskLabel, 
    interpretation, 
    imageData,
    nutrition 
  } = body;

  if (!name || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const snackResult = await execute(
    `INSERT INTO snacks (
      user_id, name, category, risk_level, risk_label, interpretation, image_data, 
      energy_kj, protein_g, fat_g, carbohydrate_g, sodium_mg, record_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`,
    [
      user.userId, 
      name, 
      category || 'snack',
      riskLevel || null, 
      riskLabel || null, 
      interpretation || null, 
      imageData || null,
      nutrition?.energy_kj || null,
      nutrition?.protein_g || null,
      nutrition?.fat_g || null,
      nutrition?.carbohydrate_g || null,
      nutrition?.sodium_mg || null
    ]
  );
  const snackId = Number(snackResult.lastInsertRowid);

  const ingredientStmts = ingredients
    .filter((ing: string) => ing.trim())
    .map((ing: string) => ({
      sql: 'INSERT INTO snack_ingredients (snack_id, ingredient_name) VALUES (?, ?)',
      args: [snackId, ing.trim()],
    }));

  if (ingredientStmts.length > 0) {
    await batch(ingredientStmts);
  }

  return NextResponse.json({ success: true, id: snackId });
}
