import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { name, ingredients, riskLevel, riskLabel, interpretation, imageData } = body;

  if (!name || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const insertSnack = db.prepare(
    `INSERT INTO snacks (user_id, name, risk_level, risk_label, interpretation, image_data, record_time) VALUES (?, ?, ?, ?, ?, ?, date('now'))`
  );
  const insertIngredient = db.prepare(
    `INSERT INTO snack_ingredients (snack_id, ingredient_name) VALUES (?, ?)`
  );

  const saveRecord = db.transaction(() => {
    const result = insertSnack.run(user.userId, name, riskLevel || null, riskLabel || null, interpretation || null, imageData || null);
    const snackId = result.lastInsertRowid;
    for (const ing of ingredients) {
      if (ing.trim()) {
        insertIngredient.run(snackId, ing.trim());
      }
    }
    return snackId;
  });

  const snackId = saveRecord();

  return NextResponse.json({ success: true, id: Number(snackId) });
}
