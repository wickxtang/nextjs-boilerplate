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

  const stmts: Array<{ sql: string; args: InValue[] }> = [];

  if (imageData !== undefined) {
    stmts.push({
      sql: `UPDATE snacks SET name = ?, risk_level = ?, risk_label = ?, image_data = ? WHERE id = ?`,
      args: [name, riskLevel || null, riskLabel || null, imageData || null, result.snackId!],
    });
  } else {
    stmts.push({
      sql: `UPDATE snacks SET name = ?, risk_level = ?, risk_label = ? WHERE id = ?`,
      args: [name, riskLevel || null, riskLabel || null, result.snackId!],
    });
  }

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
