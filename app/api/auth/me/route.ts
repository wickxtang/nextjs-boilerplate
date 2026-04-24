import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ userId: user.userId, username: user.username });
}
