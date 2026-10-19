import { pgTable, text, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { Role, TableStatus, SessionStatus, OrderStatus, SessionCloseReason, PaymentMethod, ReservationStatus } from '@/contracts';
import { nanoid } from 'nanoid';

export const users = pgTable('users', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().$type<Role>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tables = pgTable('tables', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  name: text('name').notNull(),
  qrToken: varchar('qr_token', { length: 50 }).notNull().unique().$defaultFn(() => nanoid(10)),
  seats: integer('seats').notNull(),
  status: varchar('status', { length: 20 }).notNull().$type<TableStatus>().$defaultFn(() => TableStatus.AVAILABLE),
});

export const sessions = pgTable('sessions', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  tableId: text('table_id').notNull().references(() => tables.id),
  customerId: text('customer_id').notNull().references(() => users.id),
  reservationId: text('reservation_id').references(() => reservations.id),
  status: varchar('status', { length: 20 }).notNull().$type<SessionStatus>().$defaultFn(() => SessionStatus.ACTIVE),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  closeReason: varchar('close_reason', { length: 20 }).$type<SessionCloseReason>(),
  paymentMethod: varchar('payment_method', { length: 20 }).$type<PaymentMethod>(),
  subtotalCents: integer('subtotal_cents'),
  cgstCents: integer('cgst_cents'),
  sgstCents: integer('sgst_cents'),
  totalCents: integer('total_cents'),
  discountCents: integer('discount_cents'),
  discountPercent: integer('discount_percent'),
});

export const payments = pgTable('payments', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  amountCents: integer('amount_cents').notNull(),
  method: varchar('method', { length: 20 }).notNull().$type<PaymentMethod>(),
  transactionId: text('transaction_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reservations = pgTable('reservations', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  customerId: text('customer_id').notNull().references(() => users.id),
  tableId: text('table_id').notNull().references(() => tables.id),
  reservationDate: text('reservation_date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  guestCount: integer('guest_count').notNull(),
  status: varchar('status', { length: 20 }).notNull().$type<ReservationStatus>().$defaultFn(() => ReservationStatus.PENDING),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedback = pgTable('feedback', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  customerId: text('customer_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  actorUserId: text('actor_user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const menuItems = pgTable('menu_items', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const orders = pgTable('orders', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  customerId: text('customer_id').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).notNull().$type<OrderStatus>().$defaultFn(() => OrderStatus.PLACED),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  quantity: integer('quantity').notNull().default(1),
});

export const inventory = pgTable('inventory', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(0), // Multiplied by 100 for decimals if needed, but user said KG/No.
  unit: varchar('unit', { length: 20 }).notNull(), // 'KG', 'GRAM', 'PIECE', 'LITER', etc.
  minStockLevel: integer('min_stock_level').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const menuItemIngredients = pgTable('menu_item_ingredients', {
  id: text('id').$defaultFn(() => nanoid()).primaryKey(),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  inventoryId: text('inventory_id').notNull().references(() => inventory.id, { onDelete: 'cascade' }),
  quantityNeeded: integer('quantity_needed').notNull(), // Quantity needed for 1 unit of menu item
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  orders: many(orders),
  reservations: many(reservations),
  feedback: many(feedback),
  auditLogs: many(auditLogs),
}));

export const tablesRelations = relations(tables, ({ many }) => ({
  sessions: many(sessions),
  reservations: many(reservations),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  table: one(tables, {
    fields: [sessions.tableId],
    references: [tables.id],
  }),
  customer: one(users, {
    fields: [sessions.customerId],
    references: [users.id],
  }),
  reservation: one(reservations, {
    fields: [sessions.reservationId],
    references: [reservations.id],
  }),
  orders: many(orders),
  payments: many(payments),
  feedback: many(feedback),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  session: one(sessions, {
    fields: [payments.sessionId],
    references: [sessions.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  customer: one(users, {
    fields: [reservations.customerId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [reservations.tableId],
    references: [tables.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  session: one(sessions, {
    fields: [feedback.sessionId],
    references: [sessions.id],
  }),
  customer: one(users, {
    fields: [feedback.customerId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(sessions, {
    fields: [orders.sessionId],
    references: [sessions.id],
  }),
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));
