import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '@/app/lib/db';
import { signToken, COOKIE_NAME } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }
  if (username.length < 2 || password.length < 6) {
    return NextResponse.json({ error: '用户名至少2位，密码至少6位' }, { status: 400 });
  }

  const existing = await queryOne<{ id: number }>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = await execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  const userId = Number(result.lastInsertRowid);

  const token = signToken({ userId, username });
  const res = NextResponse.json({ success: true, userId, username });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
