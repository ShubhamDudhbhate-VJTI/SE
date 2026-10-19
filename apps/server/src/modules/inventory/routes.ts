import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { Role, CreateInventorySchema, UpdateInventorySchema, AdjustInventorySchema } from '@/contracts';
import { inventoryService } from './service';

export const inventoryRouter = Router();

// Secure all inventory routes - Accessible by Kitchen and Admin
inventoryRouter.use(authenticate);
inventoryRouter.use(requireRole([Role.KITCHEN, Role.ADMIN]));

inventoryRouter.get('/', async (req, res, next) => {
  try {
    const items = await inventoryService.getAllItems();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await inventoryService.getItem(req.params.id);
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/', async (req, res, next) => {
  try {
    const data = CreateInventorySchema.parse(req.body);
    const item = await inventoryService.addItem(req.user!.userId, data);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = UpdateInventorySchema.parse(req.body);
    const item = await inventoryService.updateItem(req.user!.userId, req.params.id, data);
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.delete('/:id', async (req, res, next) => {
  try {
    await inventoryService.deleteItem(req.user!.userId, req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/:id/adjust', async (req, res, next) => {
  try {
    const data = AdjustInventorySchema.parse(req.body);
    const item = await inventoryService.adjustStock(req.user!.userId, req.params.id, data);
    res.json({ item });
  } catch (error) {
    next(error);
  }
});
