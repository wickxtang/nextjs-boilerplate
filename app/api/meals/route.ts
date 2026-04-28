import { NextRequest, NextResponse } from 'next/server';
import { queryAll, execute } from '@/app/lib/db';
import { getCurrentUser } from '@/app/lib/auth';

interface MealRow {
  id: number;
  user_id: number;
  meal_type: string;
  image_data: string | null;
  food_items: string | null;
  total_calories: number | null;
  meal_date: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date');

  let meals: MealRow[];
  if (date) {
    meals = await queryAll<MealRow>(
      'SELECT * FROM meals WHERE user_id = ? AND meal_date = ? ORDER BY created_at DESC',
      [user.userId, date]
    );
  } else {
    meals = await queryAll<MealRow>(
      'SELECT * FROM meals WHERE user_id = ? ORDER BY meal_date DESC, created_at DESC',
      [user.userId]
    );
  }

  const result = meals.map(m => ({
    id: m.id,
    mealType: m.meal_type,
    imageData: m.image_data,
    foodItems: m.food_items ? JSON.parse(m.food_items) : [],
    totalCalories: m.total_calories,
    mealDate: m.meal_date,
    createdAt: m.created_at,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { mealType, mealDate, imageData, foodItems, totalCalories } = body;

  if (!mealType || !mealDate) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const result = await execute(
    `INSERT INTO meals (user_id, meal_type, image_data, food_items, total_calories, meal_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user.userId,
      mealType,
      imageData || null,
      foodItems ? JSON.stringify(foodItems) : null,
      totalCalories || null,
      mealDate,
    ]
  );

  return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
  }

  const meal = await queryAll<MealRow>(
    'SELECT * FROM meals WHERE id = ? AND user_id = ?',
    [parseInt(id), user.userId]
  );

  if (meal.length === 0) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  await execute('DELETE FROM meals WHERE id = ?', [parseInt(id)]);
  return NextResponse.json({ success: true });
}
