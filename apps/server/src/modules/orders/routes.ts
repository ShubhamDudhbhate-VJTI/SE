import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { OrderStatus, SocketEvents, CreateOrderSchema, Role, UpdateOrderStatusSchema, canTransitionOrderStatus, PaySessionSchema, SessionCloseReason } from '@/contracts';
import { orderRepository } from './repository';
import { orderService } from './service';
import { sessionRepository } from '../sessions/repository';
import { computeBill } from '../billing';
import { PaymentService } from '../payments/service';

export const ordersRouter = Router();
const paymentService = new PaymentService();

ordersRouter.use(authenticate);

// ... (existing routes)

// POST /orders/me/pay
ordersRouter.post('/me/pay', async (req, res, next) => {
  try {
    const activeSession = await sessionRepository.findActiveByCustomerId(req.user!.userId);
    if (!activeSession) {
      throw new AppError('FORBIDDEN', 403, 'NO_ACTIVE_SESSION');
    }

    // Security check: Ensure no orders are in 'PLACED' status
    const orders = await orderRepository.getOrdersBySession(activeSession.id);
    const hasPlacedOrders = orders.some(o => o.status === OrderStatus.PLACED);
    if (hasPlacedOrders) {
      throw new AppError('CONFLICT', 409, 'Cannot pay while orders are still awaiting kitchen confirmation');
    }

    const data = PaySessionSchema.parse(req.body);

    // Use PaymentService to handle the workflow
    const result = await paymentService.handleSessionPayment(
      activeSession.id,
      data.method,
      0 // Customers don't apply their own discounts
    );

    if (result.success) {
      req.app.get('io')?.emit(SocketEvents.SESSION_UPDATED, { sessionId: activeSession.id, status: 'closed' });
      res.json({ message: 'Payment successful', transactionId: result.transactionId });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    next(err);
  }
});

// POST /orders
ordersRouter.post('/', async (req, res, next) => {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const activeSession = req.user!.role === Role.WAITER && data.sessionId
      ? await sessionRepository.getById(data.sessionId)
      : await sessionRepository.findActiveByCustomerId(req.user!.userId);
    
    if (!activeSession || activeSession.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'NO_ACTIVE_SESSION');
    }

    try {
      const order = await orderRepository.createOrderTransaction(activeSession.id, activeSession.customerId, data);
      req.app.get('io')?.emit(SocketEvents.ORDER_CREATED, { orderId: order.id });
      res.status(201).json({ order });
    } catch (e: any) {
      if (e.message.startsWith('ITEM_UNAVAILABLE')) {
        throw new AppError('CONFLICT', 409, e.message);
      }
      if (e.message.startsWith('INSUFFICIENT_STOCK')) {
        throw new AppError('CONFLICT', 409, e.message);
      }
      if (e.message.startsWith('ITEM_NOT_FOUND')) {
        throw new AppError('NOT_FOUND', 404, e.message);
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

// GET /orders/me
ordersRouter.get('/me', async (req, res, next) => {
  try {
    const activeSession = await sessionRepository.findActiveByCustomerId(req.user!.userId);
    if (!activeSession) {
      return res.json({ orders: [] });
    }

    const orders = await orderRepository.getOrdersBySession(activeSession.id);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// GET /orders/me/bill
ordersRouter.get('/me/bill', async (req, res, next) => {
  try {
    const activeSession = await sessionRepository.findActiveByCustomerId(req.user!.userId);
    if (!activeSession) {
      throw new AppError('FORBIDDEN', 403, 'NO_ACTIVE_SESSION');
    }

    const bill = await computeBill(activeSession.id);
    res.json({ bill });
  } catch (err) {
    next(err);
  }
});

// GET /orders/history
ordersRouter.get('/history', async (req, res, next) => {
  try {
    const orders = await orderRepository.getOrdersByCustomerId(req.user!.userId);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// POST /orders/:id/cancel
ordersRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const updated = await orderService.cancelOrder(req.user!.userId, req.user!.role, req.params.id);
    req.app.get('io')?.emit(SocketEvents.ORDER_STATUS_CHANGED, {
      orderId: updated.id,
      status: updated.status,
      actorRole: req.user!.role
    });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

// GET /orders (Kitchen & Admin)
ordersRouter.get('/', requireRole([Role.KITCHEN, Role.ADMIN, Role.WAITER]), async (req, res, next) => {
  try {
    const orders = await orderRepository.getActiveOrders();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id/status (Kitchen, Waiter, Runner & Admin)
ordersRouter.patch('/:id/status', requireRole([Role.KITCHEN, Role.ADMIN, Role.WAITER, Role.RUNNER]), async (req, res, next) => {
  try {
    const data = UpdateOrderStatusSchema.parse(req.body);
    const updated = await orderService.updateStatus(req.user!.userId, req.user!.role, req.params.id as string, data.status);
    req.app.get('io')?.emit(SocketEvents.ORDER_STATUS_CHANGED, {
      orderId: updated.id,
      status: updated.status,
      actorRole: req.user!.role
    });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});
