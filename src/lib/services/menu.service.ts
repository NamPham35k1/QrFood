import { getDb } from '../db';
import { Category, Product, ModifierGroup, Modifier } from '../db/types';

export interface FullMenuResponse {
  categories: (Category & { products: Product[] })[];
  featuredProducts: Product[];
}

export function getPublicMenu(restaurantId: string): FullMenuResponse {
  const db = getDb();

  // 1. Get active categories
  const categories = db
    .prepare(
      `SELECT * FROM categories
       WHERE restaurant_id = ? AND is_active = 1
       ORDER BY display_order ASC, name ASC`
    )
    .all(restaurantId) as Category[];

  // 2. Get active products
  const productsRaw = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.restaurant_id = ? AND p.is_available = 1
       ORDER BY p.display_order ASC, p.name ASC`
    )
    .all(restaurantId) as (Omit<Product, 'tags'> & { tags: string })[];

  // 3. Get modifier groups and modifiers
  const modifierGroups = db
    .prepare(
      `SELECT * FROM modifier_groups
       WHERE restaurant_id = ?`
    )
    .all(restaurantId) as ModifierGroup[];

  const modifiers = db
    .prepare(
      `SELECT m.*
       FROM modifiers m
       JOIN modifier_groups g ON m.group_id = g.id
       WHERE g.restaurant_id = ? AND m.is_available = 1`
    )
    .all(restaurantId) as Modifier[];

  const productModLinks = db
    .prepare(
      `SELECT pm.product_id, pm.modifier_group_id
       FROM product_modifier_groups pm
       JOIN products p ON pm.product_id = p.id
       WHERE p.restaurant_id = ?`
    )
    .all(restaurantId) as { product_id: string; modifier_group_id: string }[];

  // Build modifier group map with items
  const modGroupMap = new Map<string, ModifierGroup>();
  for (const group of modifierGroups) {
    modGroupMap.set(group.id, {
      ...group,
      modifiers: modifiers.filter((m) => m.group_id === group.id),
    });
  }

  // Parse products and attach modifier groups
  const products: Product[] = productsRaw.map((p) => {
    let tags: string[] = [];
    try {
      tags = JSON.parse(p.tags || '[]');
    } catch {
      tags = [];
    }

    const linkedGroupIds = productModLinks
      .filter((link) => link.product_id === p.id)
      .map((link) => link.modifier_group_id);

    const attachedGroups: ModifierGroup[] = [];
    for (const gid of linkedGroupIds) {
      const g = modGroupMap.get(gid);
      if (g) attachedGroups.push(g);
    }

    return {
      ...p,
      tags,
      modifier_groups: attachedGroups,
    };
  });

  // Group products into categories
  const categoriesWithProducts = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const featuredProducts = products.filter((p) => Boolean(p.is_featured));

  return {
    categories: categoriesWithProducts,
    featuredProducts,
  };
}

export function getProductById(restaurantId: string, productId: string): Product | null {
  const db = getDb();
  const raw = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.restaurant_id = ? AND p.id = ?`
    )
    .get(restaurantId, productId) as (Omit<Product, 'tags'> & { tags: string }) | undefined;

  if (!raw) return null;

  let tags: string[] = [];
  try {
    tags = JSON.parse(raw.tags || '[]');
  } catch {
    tags = [];
  }

  // Get modifiers
  const linkedGroups = db
    .prepare(
      `SELECT mg.*
       FROM modifier_groups mg
       JOIN product_modifier_groups pmg ON mg.id = pmg.modifier_group_id
       WHERE pmg.product_id = ?`
    )
    .all(productId) as ModifierGroup[];

  for (const g of linkedGroups) {
    const mods = db
      .prepare(`SELECT * FROM modifiers WHERE group_id = ? AND is_available = 1`)
      .all(g.id) as Modifier[];
    g.modifiers = mods;
  }

  return {
    ...raw,
    tags,
    modifier_groups: linkedGroups,
  };
}
