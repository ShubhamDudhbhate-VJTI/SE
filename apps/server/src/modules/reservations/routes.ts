import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { CreateReservationSchema, Role, ReservationStatus, UpdateReservationStatusSchema, TableStatus, SocketEvents } from '@/contracts';
import { reservationService } from './service';
import { AppError } from '../../middleware/error';

export const reservationsRouter = Router();
reservationsRouter.use(authenticate);

reservationsRouter.get('/', async (req, res, next) => {
  try {
    const reservations = await reservationService.getReservations(
      req.user!.userId,
      req.user!.role,
      typeof req.query.date === 'string' ? req.query.date : undefined
    );
    res.json({ reservations });
  } catch (error) {
    next(error);
  }
});

reservationsRouter.post('/', requireRole([Role.CUSTOMER]), async (req, res, next) => {
  try {
    const data = CreateReservationSchema.parse(req.body);
    const reservation = await reservationService.createReservation(req.user!.userId, data);
    res.status(201).json({ reservation });
  } catch (error) {
    next(error);
  }
});

reservationsRouter.patch('/:id/status', requireRole([Role.ADMIN, Role.WAITER]), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') throw new AppError('BAD_REQUEST', 400, 'Invalid ID');

    const data = UpdateReservationStatusSchema.parse(req.body);
    const result = await reservationService.updateStatus(req.user!.userId, id, data.status);

    if (data.status === ReservationStatus.SEATED && result.reservation && result.session) {
      req.app.get('io')?.emit(SocketEvents.TABLE_UPDATED, {
        tableId: result.reservation?.tableId,
        status: TableStatus.OCCUPIED
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

reservationsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') throw new AppError('BAD_REQUEST', 400, 'Invalid ID');

    const updated = await reservationService.cancelReservation(req.user!.userId, req.user!.role, id);
    res.json({ reservation: updated });
  } catch (error) {
    next(error);
  }
});

