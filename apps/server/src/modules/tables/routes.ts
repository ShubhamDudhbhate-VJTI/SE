import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { CreateTableSchema, UpdateTableSchema, Role } from '@/contracts';
import { tableService } from './service';

export const tablesRouter = Router();

tablesRouter.use(authenticate);

// All authenticated users can list tables
tablesRouter.get('/', async (req, res, next) => {
  try {
    const tablesList = await tableService.getAllTables();
    res.json({ tables: tablesList });
  } catch (err) {
    next(err);
  }
});

// Admin only routes
tablesRouter.post('/', requireRole([Role.ADMIN]), validate(CreateTableSchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const table = await tableService.createTable(req.body, io);
    res.json({ table });
  } catch (err) {
    next(err);
  }
});

tablesRouter.patch('/:id', requireRole([Role.ADMIN]), validate(UpdateTableSchema), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const table = await tableService.updateTable(req.params.id as string, req.body, io);
    res.json({ table });
  } catch (err) {
    next(err);
  }
});

tablesRouter.delete('/:id', requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const io = req.app.get('io');
    await tableService.deleteTable(req.params.id as string, io);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
