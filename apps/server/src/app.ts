import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/routes';
import { tablesRouter } from './modules/tables/routes';
import { sessionsRouter } from './modules/sessions/routes';
import { scanRouter } from './modules/scan/routes';
import { menuRouter } from './modules/menu/routes';
import { ordersRouter } from './modules/orders/routes';
import { reservationsRouter } from './modules/reservations/routes';
import { feedbackRouter } from './modules/feedback/routes';
import { staffRouter } from './modules/staff/routes';
import { reportsRouter } from './modules/reports/routes';
import { auditRouter } from './modules/audit/routes';
import paymentRouter from './modules/payments/routes';
import { inventoryRouter } from './modules/inventory/routes';

export const app = express();


app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [config.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/t', scanRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/staff', staffRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/inventory', inventoryRouter);

// Error handling must be last

app.use(errorHandler);
