import { db } from '../../db/client';
import { inventory } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { type Inventory, type CreateInventoryInput, type UpdateInventoryInput } from '@/contracts';

export const inventoryRepository = {
  async findAll(): Promise<Inventory[]> {
    const items = await db.select().from(inventory);
    return items.map(item => ({
      ...item,
      updatedAt: item.updatedAt.getTime()
    }));
  },

  async findById(id: string): Promise<Inventory | null> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    if (!item) return null;
    return {
      ...item,
      updatedAt: item.updatedAt.getTime()
    };
  },

  async create(data: CreateInventoryInput): Promise<Inventory> {
    const [item] = await db.insert(inventory).values({
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      minStockLevel: data.minStockLevel
    }).returning();
    return {
      ...item,
      updatedAt: item.updatedAt.getTime()
    };
  },

  async update(id: string, data: UpdateInventoryInput): Promise<Inventory> {
    const [item] = await db.update(inventory)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(inventory.id, id))
      .returning();
    return {
      ...item,
      updatedAt: item.updatedAt.getTime()
    };
  },

  async delete(id: string): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  },

  async adjustQuantity(id: string, adjustment: number): Promise<Inventory> {
    const [item] = await db.update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${adjustment}`,
        updatedAt: new Date()
      })
      .where(eq(inventory.id, id))
      .returning();

    return {
      ...item,
      updatedAt: item.updatedAt.getTime()
    };
  }
};
