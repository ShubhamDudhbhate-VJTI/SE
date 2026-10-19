export enum Role {
  CUSTOMER = 'customer',
  KITCHEN = 'kitchen',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  ADMIN = 'admin',
  RUNNER = 'runner'
}

export enum TableStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  OCCUPIED = 'occupied',
  BILLING = 'billing'
}

export enum SessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed'
}

export enum SessionCloseReason {
  PAID = 'paid',
  CANCELLED = 'cancelled',
  FORCE_CLOSED = 'force_closed'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi'
}

export enum OrderStatus {
  PLACED = 'placed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled'
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export const SocketEvents = {
  TABLE_UPDATED: 'table:updated',
  SESSION_UPDATED: 'session:updated',
  ORDER_CREATED: 'order:created',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  MENU_UPDATED: 'menu:updated',
  INVENTORY_UPDATED: 'inventory:updated'
} as const;

import { z } from 'zod';

export const SignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.nativeEnum(Role),
  createdAt: z.number()
});
export type User = z.infer<typeof UserSchema>;

export const TableSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  qrToken: z.string(),
  seats: z.number().int().min(1, "Seats must be at least 1"),
  status: z.nativeEnum(TableStatus)
});
export type Table = z.infer<typeof TableSchema>;

export const CreateTableSchema = z.object({
  name: z.string().min(1, "Name is required"),
  seats: z.number().int().min(1, "Seats must be at least 1")
});
export type CreateTableInput = z.infer<typeof CreateTableSchema>;

export const UpdateTableSchema = CreateTableSchema.partial();
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  customerId: z.string(),
  status: z.nativeEnum(SessionStatus),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  closeReason: z.nativeEnum(SessionCloseReason).nullable().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
  subtotalCents: z.number().int().nullable().optional(),
  cgstCents: z.number().int().nullable().optional(),
  sgstCents: z.number().int().nullable().optional(),
  totalCents: z.number().int().nullable().optional(),
  discountCents: z.number().int().nullable().optional(),
  discountPercent: z.number().nullable().optional()
});
export type Session = z.infer<typeof SessionSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  sortOrder: z.number().int()
});
export type Category = z.infer<typeof CategorySchema>;

export const CreateCategorySchema = CategorySchema.omit({ id: true });
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const MenuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  priceCents: z.number().int().min(0, "Price cannot be negative"),
  imageUrl: z.string().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int()
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateMenuItemSchema = MenuItemSchema.omit({ id: true });
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

export type CategoryWithItems = Category & { items: MenuItem[] };

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  quantity: z.number().int().min(1)
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  customerId: z.string(),
  status: z.nativeEnum(OrderStatus),
  notes: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type Order = z.infer<typeof OrderSchema>;

export type OrderWithItems = Order & { items: OrderItem[], tableName?: string };

export const CreateOrderSchema = z.object({
  sessionId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().min(1)
  })).min(1, "Order must have at least one item")
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const BillSchema = z.object({
  subtotalCents: z.number().int(),
  cgstCents: z.number().int(),
  sgstCents: z.number().int(),
  discountCents: z.number().int().default(0),
  totalCents: z.number().int()
});
export type Bill = z.infer<typeof BillSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (next === OrderStatus.CANCELLED) {
    return current === OrderStatus.PLACED || current === OrderStatus.PREPARING;
  }
  if (current === OrderStatus.PLACED && next === OrderStatus.PREPARING) return true;
  if (current === OrderStatus.PREPARING && next === OrderStatus.READY) return true;
  if (current === OrderStatus.READY && next === OrderStatus.SERVED) return true;
  return false;
}

export const PaySessionSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  discountPercent: z.number().min(0).max(100).default(0)
});
export type PaySessionInput = z.infer<typeof PaySessionSchema>;

export const CreateReservationSchema = z.object({
  tableId: z.string().min(1),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  guestCount: z.number().int().min(1)
});
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export const UpdateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus)
});
export type UpdateReservationStatusInput = z.infer<typeof UpdateReservationStatusSchema>;

export const CreateFeedbackSchema = z.object({
  sessionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional()
});
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

export const InventorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  quantity: z.number(),
  unit: z.string().min(1, "Unit is required"),
  minStockLevel: z.number(),
  updatedAt: z.number()
});
export type Inventory = z.infer<typeof InventorySchema>;

export const CreateInventorySchema = InventorySchema.omit({ id: true, updatedAt: true });
export type CreateInventoryInput = z.infer<typeof CreateInventorySchema>;

export const UpdateInventorySchema = CreateInventorySchema.partial();
export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>;

export const AdjustInventorySchema = z.object({
  adjustment: z.number(),
  notes: z.string().optional()
});
export type AdjustInventoryInput = z.infer<typeof AdjustInventorySchema>;
