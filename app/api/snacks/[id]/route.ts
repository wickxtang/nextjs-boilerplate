import { NextRequest, NextResponse } from 'next/server';
import { queryOne, batch } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';
import type { InValue } from '@libsql/client';

async function getOwnerSnack(params: Promise<{ id: string }>, userId: number) {
  const { id } = await params;
  const snackId = Number(id);
  const snack = await queryOne<{ user_id: number }>('SELECT user_id FROM snacks WHERE id = ?', [snackId]);
  if (!snack) return { error: '记录不存在', status: 404, snackId };
  if (snack.user_id !== userId) return { error: '无权操作', status: 403, snackId };
  return { snackId };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snackId = Number(id);

  const snack = await queryOne<{
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
  }>('SELECT * FROM snacks WHERE id = ?', [snackId]);

  if (!snack) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  return NextResponse.json({
    id: snack.id,
    userId: snack.user_id,
    name: snack.name,
    category: snack.category,
    riskLevel: snack.risk_level,
    riskLabel: snack.risk_label,
    interpretation: snack.interpretation,
    imageData: snack.image_data,
    nutrition: {
      energy_kj: snack.energy_kj,
      protein_g: snack.protein_g,
      fat_g: snack.fat_g,
      carbohydrate_g: snack.carbohydrate_g,
      sodium_mg: snack.sodium_mg,
    },
    recordTime: snack.record_time,
    createdAt: snack.created_at,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const result = await getOwnerSnack(params, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();
  const { 
    name, 
    category,
    ingredients, 
    riskLevel, 
    riskLabel, 
    imageData,
    nutrition 
  } = body;

  if (!name || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const stmts: Array<{ sql: string; args: InValue[] }> = [];

  const updateFields = [
    'name = ?',
    'category = ?',
    'risk_level = ?',
    'risk_label = ?',
    'energy_kj = ?',
    'protein_g = ?',
    'fat_g = ?',
    'carbohydrate_g = ?',
    'sodium_mg = ?'
  ];
  const args: InValue[] = [
    name,
    category || 'snack',
    riskLevel || null,
    riskLabel || null,
    nutrition?.energy_kj ?? null,
    nutrition?.protein_g ?? null,
    nutrition?.fat_g ?? null,
    nutrition?.carbohydrate_g ?? null,
    nutrition?.sodium_mg ?? null,
  ];

  if (imageData !== undefined) {
    updateFields.push('image_data = ?');
    args.push(imageData || null);
  }

  args.push(result.snackId!);

  stmts.push({
    sql: `UPDATE snacks SET ${updateFields.join(', ')} WHERE id = ?`,
    args,
  });

  stmts.push({ sql: `DELETE FROM snack_ingredients WHERE snack_id = ?`, args: [result.snackId!] });

  for (const ing of ingredients) {
    if (ing.trim()) {
      stmts.push({
        sql: `INSERT INTO snack_ingredients (snack_id, ingredient_name) VALUES (?, ?)`,
        args: [result.snackId!, ing.trim()],
      });
    }
  }

  await batch(stmts);

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const result = await getOwnerSnack(params, user.userId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  await batch([
    { sql: 'DELETE FROM snack_ingredients WHERE snack_id = ?', args: [result.snackId!] },
    { sql: 'DELETE FROM snacks WHERE id = ?', args: [result.snackId!] },
  ]);
  return NextResponse.json({ success: true });
}
