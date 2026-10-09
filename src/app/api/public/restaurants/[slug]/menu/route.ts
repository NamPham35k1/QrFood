import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Restaurant } from '@/lib/db/types';
import { getPublicMenu } from '@/lib/services/menu.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const db = getDb();

    const restaurant = db
      .prepare(`SELECT * FROM restaurants WHERE slug = ? AND is_active = 1`)
      .get(slug) as Restaurant | undefined;

    if (!restaurant) {
      return NextResponse.json({ success: false, error: 'Nhà hàng không tồn tại.' }, { status: 404 });
    }

    const menu = getPublicMenu(restaurant.id);

    return NextResponse.json({
      success: true,
      restaurant,
      categories: menu.categories,
      featuredProducts: menu.featuredProducts,
    });
  } catch (error) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json({ success: false, error: 'Lỗi tải menu thực đơn.' }, { status: 500 });
  }
}
