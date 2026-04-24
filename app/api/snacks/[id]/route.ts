import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

async function getOwnerSnack(params: Promise<{ id: string }>, userId: number) {
  const { id } = await params;
  const snackId = Number(id);
  const snack = db.prepare('SELECT user_id FROM snacks WHERE id = ?').get(snackId) as { user_id: number } | undefined;
  if (!snack) return { error: '记录不存在', status: 404, snackId };
  if (snack.user_id !== userId) return { error: '无权操作', status: 403, snackId };
  return { snackId };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const result = await getOwnerSnack(params, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  const { name, ingredients, riskLevel, riskLabel, imageData } = body;

  if (!name || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const updateSnack = imageData !== undefined
    ? db.prepare(`UPDATE snacks SET name = ?, risk_level = ?, risk_label = ?, image_data = ? WHERE id = ?`)
    : db.prepare(`UPDATE snacks SET name = ?, risk_level = ?, risk_label = ? WHERE id = ?`);
  const deleteIngredients = db.prepare(`DELETE FROM snack_ingredients WHERE snack_id = ?`);
  const insertIngredient = db.prepare(`INSERT INTO snack_ingredients (snack_id, ingredient_name) VALUES (?, ?)`);

  db.transaction(() => {
    if (imageData !== undefined) {
      updateSnack.run(name, riskLevel || null, riskLabel || null, imageData || null, result.snackId);
    } else {
      updateSnack.run(name, riskLevel || null, riskLabel || null, result.snackId);
    }
    deleteIngredients.run(result.snackId);
    for (const ing of ingredients) {
      if (ing.trim()) insertIngredient.run(result.snackId, ing.trim());
    }
  })();

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const result = await getOwnerSnack(params, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  db.prepare('DELETE FROM snacks WHERE id = ?').run(result.snackId);
  return NextResponse.json({ success: true });
}
