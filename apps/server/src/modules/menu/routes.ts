import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { Role, CreateCategorySchema, UpdateCategorySchema, CreateMenuItemSchema, UpdateMenuItemSchema } from '@/contracts';
import { menuService } from './service';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

export const menuRouter = Router();

// Public: Get entire menu
menuRouter.get('/', async (req, res, next) => {
  try {
    const menu = await menuService.getMenu();
    res.json({ menu });
  } catch (err) {
    next(err);
  }
});

// Admin: Manage Categories
menuRouter.post('/categories', authenticate, requireRole([Role.ADMIN]), validate(CreateCategorySchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const category = await menuService.createCategory(req.body, io);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

menuRouter.put('/categories/:id', authenticate, requireRole([Role.ADMIN]), validate(UpdateCategorySchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const category = await menuService.updateCategory(req.params.id as string, req.body, io);
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

menuRouter.delete('/categories/:id', authenticate, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    await menuService.deleteCategory(req.params.id as string, io);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Admin: Manage Menu Items
menuRouter.post('/items', authenticate, requireRole([Role.ADMIN]), validate(CreateMenuItemSchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const item = await menuService.createMenuItem(req.body, io);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

menuRouter.put('/items/:id', authenticate, requireRole([Role.ADMIN]), validate(UpdateMenuItemSchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const item = await menuService.updateMenuItem(req.params.id as string, req.body, io);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

menuRouter.patch('/items/:id/availability', authenticate, requireRole([Role.ADMIN, Role.KITCHEN]), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
    const item = await menuService.updateMenuItem(req.params.id as string, { isAvailable }, io);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

menuRouter.delete('/items/:id', authenticate, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    await menuService.deleteMenuItem(req.params.id as string, io);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
