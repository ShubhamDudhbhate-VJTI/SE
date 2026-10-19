import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { Role, SessionStatus, SocketEvents, SessionCloseReason, PaySessionSchema, PaymentMethod, TableStatus } from '@/contracts';
import { sessionRepository } from './repository';
import { tableRepository } from '../tables/repository';
import { orderRepository } from '../orders/repository';
import { computeBill } from '../billing';
import { AppError } from '../../middleware/error';
import { sessionService } from './service';

export const sessionsRouter = Router();

sessionsRouter.use(authenticate);

// GET /sessions/me
sessionsRouter.get('/me', requireRole([Role.CUSTOMER]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepository.findActiveByCustomerId(req.user!.userId);
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/cancel
sessionsRouter.post('/:id/cancel', requireRole([Role.CUSTOMER]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') throw new AppError('BAD_REQUEST', 400, 'Invalid ID');

    const updatedSession = await sessionService.cancelSession(req.user!.userId, id);
    req.app.get('io')?.emit(SocketEvents.SESSION_UPDATED, { sessionId: updatedSession.id, status: SessionStatus.CLOSED });
    res.json({ session: updatedSession });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/request-bill
sessionsRouter.post('/request-bill', requireRole([Role.CUSTOMER, Role.WAITER, Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, tableId } = req.body;
    const { session, table } = await sessionService.requestBill(req.user!.userId, req.user!.role, sessionId, tableId);

    req.app.get('io')?.emit(SocketEvents.TABLE_UPDATED, { table });
    req.app.get('io')?.emit(SocketEvents.SESSION_UPDATED, { sessionId: session.id, status: session.status });

    res.json({ message: 'Bill requested', tableStatus: table.status });
  } catch (err) {
    next(err);
  }
});

// GET /sessions
sessionsRouter.get('/', requireRole([Role.CASHIER, Role.ADMIN, Role.WAITER]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeSessions = await sessionRepository.getActiveSessions();
    const result = [];
    for (const session of activeSessions) {
      const table = await tableRepository.findById(session.tableId);
      const orders = await orderRepository.getOrdersBySession(session.id);
      let unservedCount = 0;
      for (const order of orders) {
        if (order.status !== 'cancelled' && order.status !== 'served') {
          unservedCount++;
        }
      }
      const bill = await computeBill(session.id, session.discountPercent || 0);
      result.push({
        ...session,
        tableName: table?.name || 'Unknown',
        unservedCount,
        bill
      });
    }
    res.json({ sessions: result });
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id/orders
sessionsRouter.get('/:id/orders', requireRole([Role.WAITER, Role.CASHIER, Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await orderRepository.getOrdersBySession(req.params.id as string);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions
 * Staff seating a walk-in customer
 */
sessionsRouter.post('/', requireRole([Role.WAITER, Role.CASHIER, Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId, customerId } = req.body;
    const session = await sessionService.createWalkInSession(req.user!.userId, tableId, customerId);

    const updatedTable = await tableRepository.findById(tableId);
    if (updatedTable) {
      req.app.get('io')?.emit(SocketEvents.TABLE_UPDATED, { table: updatedTable });
    }

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/pay
sessionsRouter.post('/:id/pay', requireRole([Role.CASHIER, Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') throw new AppError('BAD_REQUEST', 400, 'Invalid ID');

    const data = PaySessionSchema.parse(req.body);
    const updatedSession = await sessionService.closeSession(
      req.user!.userId,
      id,
      SessionCloseReason.PAID,
      data.method,
      data.discountPercent
    );

    const updatedTable = await tableRepository.findById(updatedSession.tableId);
    req.app.get('io')?.emit(SocketEvents.SESSION_UPDATED, { sessionId: updatedSession.id, status: SessionStatus.CLOSED });
    if (updatedTable) {
      req.app.get('io')?.emit(SocketEvents.TABLE_UPDATED, { table: updatedTable });
    }

    res.json({ session: updatedSession });
  } catch (err) {
    next(err);
  }
});

// POST /sessions/:id/force-close
sessionsRouter.post('/:id/force-close', requireRole([Role.CASHIER, Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') throw new AppError('BAD_REQUEST', 400, 'Invalid ID');

    const updatedSession = await sessionService.closeSession(
      req.user!.userId,
      id,
      SessionCloseReason.FORCE_CLOSED
    );

    const updatedTable = await tableRepository.findById(updatedSession.tableId);
    req.app.get('io')?.emit(SocketEvents.SESSION_UPDATED, { sessionId: updatedSession.id, status: SessionStatus.CLOSED });
    if (updatedTable) {
      req.app.get('io')?.emit(SocketEvents.TABLE_UPDATED, { table: updatedTable });
    }

    res.json({ session: updatedSession });
  } catch (err) {
    next(err);
  }
});
