import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, ingredients, riskLevel, riskLabel, interpretation } = body;

  if (!name || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const insertSnack = db.prepare(
    `INSERT INTO snacks (name, risk_level, risk_label, interpretation, record_time) VALUES (?, ?, ?, ?, date('now'))`
  );
  const insertIngredient = db.prepare(
    `INSERT INTO snack_ingredients (snack_id, ingredient_name) VALUES (?, ?)`
  );

  const saveRecord = db.transaction((name: string, ingredients: string[], riskLevel: string, riskLabel: string, interpretation: string) => {
    const result = insertSnack.run(name, riskLevel || null, riskLabel || null, interpretation || null);
    const snackId = result.lastInsertRowid;
    for (const ing of ingredients) {
      if (ing.trim()) {
        insertIngredient.run(snackId, ing.trim());
      }
    }
    return snackId;
  });

  const snackId = saveRecord(name, ingredients, riskLevel, riskLabel, interpretation);

  return NextResponse.json({ success: true, id: Number(snackId) });
}
