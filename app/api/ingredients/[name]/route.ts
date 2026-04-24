import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { name } = await params;
  const ingredientName = decodeURIComponent(name);

  const snacks = await queryAll<{
    id: number;
    name: string;
    risk_level: string;
    risk_label: string;
    image_data: string | null;
    record_time: string;
  }>(`
    SELECT s.id, s.name, s.risk_level, s.risk_label, s.image_data, s.record_time
    FROM snacks s
    JOIN snack_ingredients si ON s.id = si.snack_id
    WHERE si.ingredient_name = ? AND s.user_id = ?
    ORDER BY s.record_time DESC
  `, [ingredientName, user.userId]);

  return NextResponse.json({
    ingredientName,
    snackCount: snacks.length,
    snacks: snacks.map(s => ({
      id: s.id,
      name: s.name,
      riskLevel: s.risk_level,
      riskLabel: s.risk_label,
      imageData: s.image_data,
      recordTime: s.record_time,
    })),
  });
}
