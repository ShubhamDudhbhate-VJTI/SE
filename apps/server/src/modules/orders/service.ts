import { orderRepository } from './repository';
import { AppError } from '../../middleware/error';
import { OrderStatus, Role, canTransitionOrderStatus } from '@/contracts';
import { recordAudit } from '../audit/service';

export class OrderService {
  async cancelOrder(userId: string, role: Role, orderId: string) {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) {
      throw new AppError('NOT_FOUND', 404, 'Order not found');
    }

    if (role === Role.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new AppError('FORBIDDEN', 403, 'Cannot cancel another customer order');
      }
      if (order.status !== OrderStatus.PLACED) {
        throw new AppError('CONFLICT', 409, 'Order is already being prepared and cannot be cancelled');
      }
    } else if (role === Role.KITCHEN) {
      if (order.status !== OrderStatus.PLACED && order.status !== OrderStatus.PREPARING) {
        throw new AppError('CONFLICT', 409, 'Kitchen can only cancel orders that are placed or preparing');
      }
    } else if (role !== Role.ADMIN) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions');
    }

    const updated = await orderRepository.updateOrderStatus(order.id, OrderStatus.CANCELLED);
    if (!updated) {
      throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to cancel order');
    }
    await recordAudit({ actorUserId: userId, action: 'ORDER_CANCELLED', entityType: 'ORDER', entityId: order.id });
    return updated;
  }

  async updateStatus(userId: string, role: Role, orderId: string, newStatus: OrderStatus) {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) {
      throw new AppError('NOT_FOUND', 404, 'Order not found');
    }

    if (!canTransitionOrderStatus(order.status, newStatus)) {
      throw new AppError('CONFLICT', 409, `Invalid status transition from ${order.status} to ${newStatus}`);
    }

    // Role checks
    if (newStatus === OrderStatus.SERVED && ![Role.WAITER, Role.RUNNER, Role.ADMIN, Role.KITCHEN].includes(role)) {
      throw new AppError('FORBIDDEN', 403, 'Only staff can mark orders as served');
    }

    if ([OrderStatus.PREPARING, OrderStatus.READY].includes(newStatus) && ![Role.KITCHEN, Role.ADMIN].includes(role)) {
      throw new AppError('FORBIDDEN', 403, 'Only kitchen staff can update preparation status');
    }

    const updated = await orderRepository.updateOrderStatus(order.id, newStatus);
    if (!updated) {
      throw new AppError('INTERNAL_SERVER_ERROR', 500, 'Failed to update order status');
    }
    await recordAudit({
      actorUserId: userId,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: order.id,
      metadata: { status: newStatus }
    });
    return updated;
  }
}

export const orderService = new OrderService();
