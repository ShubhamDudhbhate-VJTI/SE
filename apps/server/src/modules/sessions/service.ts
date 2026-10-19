import { sessionRepository } from './repository';
import { tableRepository } from '../tables/repository';
import { orderRepository } from '../orders/repository';
import { computeBill } from '../billing';
import { AppError } from '../../middleware/error';
import { recordAudit } from '../audit/service';
import {
  SessionStatus,
  SessionCloseReason,
  PaymentMethod,
  TableStatus,
  Role,
  OrderStatus
} from '@/contracts';

export class SessionService {
  async cancelSession(userId: string, sessionId: string) {
    const session = await sessionRepository.getById(sessionId);
    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new AppError('NOT_FOUND', 404, 'Active session not found');
    }

    const orders = await orderRepository.getOrdersBySession(session.id);
    const hasStartedOrder = orders.some((order) => order.status !== 'cancelled');
    if (hasStartedOrder) {
      throw new AppError('CONFLICT', 409, 'This table cannot be cancelled after an order has been placed');
    }

    const bill = await computeBill(session.id, 0);
    const updatedSession = await sessionRepository.closeSessionTransaction(session.id, {
      closeReason: SessionCloseReason.CANCELLED,
      paymentMethod: null,
      discountPercent: 0,
      ...bill
    });

    await recordAudit({
      actorUserId: userId,
      action: 'SESSION_CANCELLED',
      entityType: 'SESSION',
      entityId: session.id,
      metadata: { tableId: session.tableId }
    });

    return updatedSession;
  }

  async requestBill(userId: string, role: Role, sessionId?: string, tableId?: string) {
    let session;
    if (role === Role.CUSTOMER) {
      session = await sessionRepository.findActiveByCustomerId(userId);
    } else {
      if (sessionId) {
        session = await sessionRepository.getById(sessionId);
      } else if (tableId) {
        const activeSessions = await sessionRepository.getActiveSessions();
        session = activeSessions.find(s => s.tableId === tableId);
      }
    }

    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new AppError('NOT_FOUND', 404, 'No active session found for this request');
    }

    // Security check: Ensure no orders are in 'PLACED' status
    const orders = await orderRepository.getOrdersBySession(session.id);
    const hasPlacedOrders = orders.some(o => o.status === OrderStatus.PLACED);
    if (hasPlacedOrders) {
      throw new AppError('CONFLICT', 409, 'Cannot request bill while orders are still awaiting kitchen confirmation');
    }

    const table = await tableRepository.updateStatus(session.tableId, TableStatus.BILLING);
    return { session, table };
  }

  async closeSession(
    userId: string,
    sessionId: string,
    closeReason: SessionCloseReason,
    paymentMethod?: PaymentMethod,
    discountPercent = 0
  ) {
    const session = await sessionRepository.getById(sessionId);
    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new AppError('NOT_FOUND', 404, 'Active session not found');
    }

    if (closeReason === SessionCloseReason.PAID) {
      const orders = await orderRepository.getOrdersBySession(session.id);
      const hasPlacedOrders = orders.some(o => o.status === OrderStatus.PLACED);
      if (hasPlacedOrders) {
        throw new AppError('CONFLICT', 409, 'Cannot close session while orders are still awaiting kitchen confirmation');
      }
    }

    const bill = await computeBill(session.id, paymentMethod ? discountPercent : 0);
    const updatedSession = await sessionRepository.closeSessionTransaction(session.id, {
      closeReason,
      paymentMethod,
      discountPercent,
      ...bill
    });

    await recordAudit({
      actorUserId: userId,
      action: closeReason === SessionCloseReason.PAID ? 'PAYMENT_RECORDED' : 'SESSION_FORCE_CLOSED',
      entityType: 'SESSION',
      entityId: session.id,
      metadata: { paymentMethod, discountPercent, totalCents: bill.totalCents },
    });

    return updatedSession;
  }

  async createWalkInSession(userId: string, tableId: string, customerId: string) {
    const table = await tableRepository.findById(tableId);
    if (!table || table.status !== TableStatus.AVAILABLE) {
        throw new AppError('CONFLICT', 409, 'Table is not available');
    }

    const session = await sessionRepository.createSessionTransaction(tableId, customerId);

    await recordAudit({
      actorUserId: userId,
      action: 'SESSION_CREATED',
      entityType: 'SESSION',
      entityId: session.id,
      metadata: { tableId, customerId, type: 'walk-in' }
    });

    return session;
  }
}

export const sessionService = new SessionService();
