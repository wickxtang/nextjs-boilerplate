import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;
  const snackId = Number(id);

  const snack = db.prepare('SELECT user_id FROM snacks WHERE id = ?').get(snackId) as { user_id: number } | undefined;
  if (!snack) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }
  if (snack.user_id !== user.userId) {
    return NextResponse.json({ error: '无权删除' }, { status: 403 });
  }

  db.prepare('DELETE FROM snacks WHERE id = ?').run(snackId);

  return NextResponse.json({ success: true });
}
