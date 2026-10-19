import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOrders } from '../hooks/useOrders';
import { useNavigate } from 'react-router-dom';
import { OrderStatus, PaymentMethod, OrderWithItems } from '@/contracts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Clock, CreditCard, IndianRupee, Smartphone, ShieldCheck, CheckCircle2, Trash2, History as HistoryIcon, Printer, X, AlertTriangle, Star } from 'lucide-react';
import { socket } from '../lib/socket';
import { SocketEvents } from '@/contracts';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../components/ui/dialog";

gsap.registerPlugin(useGSAP);

export default function OrdersPage() {
  const navigate = useNavigate();
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [view, setView] = useState<'active' | 'history'>('active');
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [showCannotCancel, setShowCannotCancel] = useState(false);
  const [kitchenCancelledOrder, setKitchenCancelledOrder] = useState<{ id: string } | null>(null);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedOrderIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<OrderWithItems | null>(null);

  const { orders, isLoadingOrders, ordersError, bill, cancelOrder, pay, isPaying, history, isLoadingHistory, submitFeedback, requestBill } = useOrders();

  useEffect(() => {
    const handleStatusChange = (data: { orderId: string, status: OrderStatus, actorRole?: string }) => {
      if (data.status === OrderStatus.CANCELLED && data.actorRole && data.actorRole !== 'customer') {
        // If the kitchen or staff cancelled the order
        setKitchenCancelledOrder({ id: data.orderId });
      }
    };

    socket.on(SocketEvents.ORDER_STATUS_CHANGED, handleStatusChange);
    return () => {
      socket.off(SocketEvents.ORDER_STATUS_CHANGED, handleStatusChange);
    };
  }, []);

  const activeOrders = orders?.filter(o => !dismissedOrderIds.includes(o.id)) || [];
  const completedOrders = history?.filter(o => !dismissedOrderIds.includes(o.id)) || [];

  const hasUnservedOrders = activeOrders.some(o => o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELLED);

  // Handle cancellation errors (e.g. if kitchen starts preparing while user clicks cancel)
  useEffect(() => {
    if (cancelOrder.isError) {
      const err = cancelOrder.error as any;
      if (err?.response?.status === 409) {
        setShowCannotCancel(true);
      }
      cancelOrder.reset();
    }
  }, [cancelOrder.isError, cancelOrder.reset]);

  const statusSteps = [
    OrderStatus.PLACED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.SERVED,
  ];

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED: return 'bg-blue-50 border-blue-100 text-blue-700';
      case OrderStatus.PREPARING: return 'bg-amber-50 border-amber-100 text-amber-700';
      case OrderStatus.READY: return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case OrderStatus.SERVED: return 'bg-zinc-50 border-zinc-100 text-zinc-700';
      case OrderStatus.CANCELLED: return 'bg-red-50 border-red-100 text-red-700';
      default: return 'bg-gray-50 border-gray-100 text-gray-700';
    }
  };

  const handleDismiss = (orderId: string) => {
    setDismissedOrderIds(prev => {
      const next = [...prev, orderId];
      localStorage.setItem('dismissedOrderIds', JSON.stringify(next));
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePayment = async () => {
    try {
      const currentSessionId = activeOrders[0]?.sessionId;

      if (paymentMethod === PaymentMethod.CASH) {
        await requestBill();
      } else {
        await pay({ method: paymentMethod });
      }

      setLastSessionId(currentSessionId);
      setShowSuccess(true);
      setIsPayModalOpen(false);
      setDismissedOrderIds([]);
      localStorage.removeItem('dismissedOrderIds');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setPaymentError('Some orders are still being confirmed by the kitchen. Please wait for the kitchen to start preparing before paying.');
      } else {
        setPaymentError('Payment failed. Please try again or pay at the counter.');
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!lastSessionId || rating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({
        sessionId: lastSessionId,
        rating,
        comment: comment || undefined
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Feedback submission failed", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-[#f3eadf] text-[#28231f] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce shrink-0">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-[#756b63] mb-8">Thank you for dining with us. Your session is now closed.</p>

        {!feedbackSubmitted ? (
          <Card className="w-full max-w-md border-[#d9cbbd] bg-white shadow-xl rounded-[2rem] overflow-hidden mb-8">
            <CardContent className="p-8">
              <h2 className="text-lg font-bold mb-4">Rate your experience</h2>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      className={cn(
                        "w-10 h-10 transition-colors",
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-[#d9cbbd] fill-transparent"
                      )}
                    />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Any comments? (Optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full min-h-[100px] rounded-xl border border-[#d9cbbd] bg-[#f3eadf]/30 p-4 text-sm focus:ring-2 focus:ring-[#356b4f] outline-none transition-all resize-none mb-6"
              />
              <Button
                onClick={handleFeedbackSubmit}
                disabled={rating === 0 || isSubmittingFeedback}
                className="w-full h-12 bg-[#356b4f] hover:bg-[#2d5a42] text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 animate-in fade-in slide-in-from-bottom-4">
            <p className="font-bold">Thank you for your feedback!</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={() => window.location.href = '/'} className="bg-[#28231f] hover:bg-[#3d352f] text-white font-bold px-8 py-6 rounded-xl">
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => { setShowSuccess(false); setView('history'); }} className="border-[#d9cbbd] text-[#28231f] px-8 py-6 rounded-xl hover:bg-[#eadfd2]">
            View History
          </Button>
        </div>
      </div>
    );
  }

  const renderActiveOrders = () => {
    if (isLoadingOrders) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-1.5 rounded-[2rem] border border-[#d9cbbd] bg-[#fffaf3]">
              <Skeleton className="h-[240px] w-full rounded-[calc(2rem-0.375rem)]" />
            </div>
          ))}
        </div>
      );
    }

    if (ordersError) {
      return (
        <div className="text-center p-12 border border-red-200 bg-red-50 rounded-3xl text-red-600 font-light border-dashed">
          {(ordersError as Error).message || "Failed to load orders."}
        </div>
      );
    }

    if (activeOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Clock className="w-16 h-16 text-[#d9cbbd] mb-6 stroke-1" />
          <p className="text-[#756b63] text-xl font-light">No active orders in this session.</p>
          {!isLoadingOrders && !ordersError && (
             <Button onClick={() => navigate('/menu')} variant="ghost" className="mt-4 text-[#356b4f] hover:bg-[#eadfd2]">
               Go to Menu
             </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeOrders.map(order => (
          <div key={order.id} className="order-card group">
            <div className="p-1.5 rounded-[2rem] bg-[#fffaf3] border border-[#d9cbbd] shadow-sm transition-transform duration-500 hover:scale-[1.02]">
              <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#fffaf3] p-6 relative flex flex-col justify-between min-h-[240px]">
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-mono text-[#756b63] uppercase tracking-widest">#{order.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.status === OrderStatus.CANCELLED && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(order.id);
                          }}
                          className="p-1 text-[#756b63] hover:text-red-500 transition-colors"
                          title="Dismiss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-6">
                    {order.status === OrderStatus.CANCELLED ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-red-700">
                        <X className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1">
                        {statusSteps.map((step, index) => {
                          const currentIndex = statusSteps.indexOf(order.status);
                          const active = index <= currentIndex;
                          return (
                            <div key={step} className="space-y-1">
                              <div className={`h-1 rounded-full ${active ? 'bg-emerald-500' : 'bg-[#eadfd2]'}`} />
                              <span className={`block text-[9px] ${active ? 'text-emerald-700' : 'text-[#756b63]'}`}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-3">
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between text-sm">
                        <span className={cn("text-[#28231f]", order.status === OrderStatus.CANCELLED && "text-[#756b63] line-through decoration-red-300")}>
                          <span className="text-[#756b63] mr-2">{item.quantity}x</span> {item.name}
                        </span>
                        <span className={cn("text-[#356b4f] font-medium", order.status === OrderStatus.CANCELLED && "text-[#756b63] line-through")}>
                          ₹{((item.priceCents * item.quantity) / 100).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.SERVED && order.status !== OrderStatus.READY && (
                  <div className="mt-8 pt-4 border-t border-[#f3eadf] flex justify-end">
                    <button 
                      onClick={() => {
                        if (order.status === OrderStatus.PLACED) {
                          setOrderToCancel(order.id);
                        } else {
                          setShowCannotCancel(true);
                        }
                      }}
                      disabled={cancelOrder.isPending}
                      className="text-xs font-semibold text-red-600 uppercase tracking-widest hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {cancelOrder.isPending && orderToCancel === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHistory = () => {
    if (isLoadingHistory) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-[#fffaf3]" />
          ))}
        </div>
      );
    }

    if (completedOrders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HistoryIcon className="w-16 h-16 text-[#d9cbbd] mb-6 stroke-1" />
          <p className="text-[#756b63] text-xl font-light">Your history is empty.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {completedOrders.map(order => (
          <div
            key={order.id}
            onClick={() => {
              setSelectedHistoryOrder(order);
              setIsDetailModalOpen(true);
            }}
            className="order-card p-6 rounded-2xl bg-[#fffaf3] border border-[#d9cbbd] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-[#756b63] tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                <span className="text-[10px] text-[#756b63] font-medium uppercase tracking-widest">
                  {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm')}
                </span>
                {order.tableName && (
                  <span className="text-[10px] bg-[#f3eadf] text-[#756b63] px-2 py-0.5 rounded-full uppercase">
                    Table {order.tableName}
                  </span>
                )}
              </div>
              <div className="text-sm text-[#28231f] group-hover:text-[#356b4f] transition-colors">
                {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
              <div className="text-xl font-bold text-[#356b4f]">
                ₹{(order.items.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0) / 100).toFixed(2)}
              </div>
              {(!orders?.some(o => o.id === order.id) || order.status === OrderStatus.CANCELLED) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(order.id);
                  }}
                  className="p-2 text-[#756b63] hover:text-red-500 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3eadf] text-[#28231f] font-sans pb-32">
      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#d9cbbd] pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visit Activity</h1>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-[#756b63]">Track your orders and settle your bill.</p>
              {activeOrders.length > 0 && (
                <span className="text-[10px] font-mono text-[#a3543e] opacity-60 bg-white/50 px-2 py-0.5 rounded border border-[#d9cbbd]/50">
                  TOKEN: {activeOrders[0].id.slice(0, 4)}...
                </span>
              )}
            </div>
          </div>

          <div className="flex bg-[#eadfd2] p-1 rounded-xl border border-[#cbbbaa]">
            <button
              onClick={() => setView('active')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                view === 'active' ? 'bg-[#356b4f] text-white shadow-sm' : 'text-[#756b63] hover:text-[#28231f]'
              }`}
            >
              This Session ({activeOrders.length})
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                view === 'history' ? 'bg-[#356b4f] text-white shadow-sm' : 'text-[#756b63] hover:text-[#28231f]'
              }`}
            >
              Past Visits
            </button>
          </div>
        </header>

        <div className="space-y-6">
          {view === 'active' ? renderActiveOrders() : renderHistory()}
        </div>

        {bill && activeOrders.length > 0 && view === 'active' && (
          <div className="mt-16 pt-12 border-t border-[#d9cbbd]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
              <Card className="border-[#d9cbbd] bg-white shadow-sm overflow-hidden">
                <div className="bg-[#f8f9fa] px-6 py-4 border-b border-zinc-100">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Bill Summary</h2>
                </div>
                <CardContent className="p-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#756b63]">Subtotal</span>
                    <span className="font-medium">₹{(bill.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#756b63]">Taxes (GST 5%)</span>
                    <span className="font-medium">₹{((bill.cgstCents + bill.sgstCents) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                    <span className="text-lg font-bold">Total Amount</span>
                    <span className="text-2xl font-bold text-[#356b4f]">₹{((bill?.totalCents ?? 0) / 100).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Button
                  onClick={() => setIsPayModalOpen(true)}
                  disabled={hasUnservedOrders}
                  className="w-full h-16 rounded-2xl bg-[#356b4f] hover:bg-[#2d5a42] text-white font-bold text-lg shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasUnservedOrders ? 'Awaiting Service Completion' : 'Checkout & Pay'}
                </Button>
                {hasUnservedOrders ? (
                   <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest text-center animate-pulse">
                     ✋ All items must be served before you can pay
                   </p>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#9b8e83]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Professional Secure Payment
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#fffaf3] border-[#d9cbbd] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#28231f]">Order Details</DialogTitle>
              </DialogHeader>
              <p className="text-[#756b63] text-sm absolute top-14">Receipt for Table {selectedHistoryOrder?.tableName || 'N/A'}</p>
              <DialogClose className="p-2 hover:bg-[#f3eadf] rounded-full transition-colors">
                <X className="w-6 h-6 text-[#756b63]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 mt-4">
              {selectedHistoryOrder && (
                <>
                  <div className="bg-white border border-[#d9cbbd] rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between text-xs font-mono text-[#756b63] uppercase tracking-widest pb-4 border-b border-[#f3eadf]">
                      <span>Order ID</span>
                      <span>#{selectedHistoryOrder.id.slice(0, 12)}</span>
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#756b63] text-[10px] uppercase tracking-widest">
                          <th className="text-left font-bold pb-2">Item</th>
                          <th className="text-center font-bold pb-2">Qty</th>
                          <th className="text-right font-bold pb-2">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f3eadf]">
                        {selectedHistoryOrder.items.map((item, idx) => (
                          <tr key={idx} className="group">
                            <td className="py-3 text-[#28231f] font-medium">{item.name}</td>
                            <td className="py-3 text-center text-[#756b63]">{item.quantity}</td>
                            <td className="py-3 text-right text-[#356b4f] font-bold">₹{(item.priceCents * item.quantity / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#f3eadf] rounded-2xl p-6 border border-[#d9cbbd]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#756b63] text-xs uppercase tracking-widest font-bold">Grand Total</span>
                      <span className="text-[#356b4f] font-bold text-2xl">
                        ₹{(selectedHistoryOrder.items.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#756b63] italic mt-2">Placed on {format(new Date(selectedHistoryOrder.createdAt), 'MMMM dd, yyyy at hh:mm a')}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1 rounded-xl border-[#d9cbbd] text-[#28231f] flex items-center justify-center gap-2 hover:bg-[#eadfd2]"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>
              <Button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 rounded-xl bg-[#356b4f] hover:bg-[#2d5a42] text-white font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedHistoryOrder && createPortal(
        <div className="print-only">
           <div className="text-center border-b-2 border-black pb-6 mb-8">
              <h1 className="text-2xl font-bold">RMS RESTAURANT</h1>
              <p className="text-sm">ORDER RECEIPT</p>
           </div>
           <div className="flex justify-between mb-6 text-xs uppercase">
              <div>
                 <p>Table: {selectedHistoryOrder.tableName}</p>
                 <p>Date: {format(new Date(selectedHistoryOrder.createdAt), 'yyyy-MM-dd')}</p>
              </div>
              <div className="text-right">
                 <p>ID: {selectedHistoryOrder.id.slice(0,8)}</p>
                 <p>Time: {format(new Date(selectedHistoryOrder.createdAt), 'HH:mm')}</p>
              </div>
           </div>
           <table className="w-full text-xs mb-8">
              <thead className="border-b border-black">
                 <tr>
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Amount</th>
                 </tr>
              </thead>
              <tbody>
                 {selectedHistoryOrder.items.map((item, idx) => (
                    <tr key={idx}>
                       <td className="py-2">{item.name}</td>
                       <td className="text-center py-2">{item.quantity}</td>
                       <td className="text-right py-2">₹{(item.priceCents * item.quantity / 100).toFixed(2)}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <div className="border-t-2 border-black pt-4 text-right">
              <p className="text-lg font-bold">Total: ₹{(selectedHistoryOrder.items.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0) / 100).toFixed(2)}</p>
           </div>
        </div>,
        document.body
      )}

      {/* Payment Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#fffaf3] border-[#d9cbbd] rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-2 text-[#28231f]">Checkout</DialogTitle>
            </DialogHeader>
            <p className="text-[#756b63] text-sm mb-8">Choose your preferred payment method</p>

            <div className="space-y-4 mb-8">
              {[
                { id: PaymentMethod.UPI, name: 'UPI / Scan QR', icon: Smartphone },
                { id: PaymentMethod.CARD, name: 'Credit / Debit Card', icon: CreditCard },
                { id: PaymentMethod.CASH, name: 'Pay at Counter', icon: IndianRupee },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                    paymentMethod === method.id
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : 'bg-[#f3eadf] border-[#d9cbbd] text-[#28231f] hover:bg-[#eadfd2]'
                  }`}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="font-semibold">{method.name}</span>
                </button>
              ))}
            </div>

            <div className="bg-[#f3eadf] rounded-2xl p-6 mb-8 border border-[#d9cbbd]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#756b63] text-xs uppercase tracking-widest font-bold">Total Amount</span>
                <span className="text-[#356b4f] font-bold text-xl">₹{((bill?.totalCents ?? 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl text-[#756b63] hover:text-[#28231f]"
                  disabled={isPaying}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handlePayment}
                className="flex-[2] rounded-xl bg-[#356b4f] hover:bg-[#2d5a42] text-white font-bold py-6"
                disabled={isPaying}
              >
                {isPaying ? 'Processing...' : paymentMethod === PaymentMethod.CASH ? 'Request Bill' : 'Pay Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <AlertDialogContent className="bg-[#fffaf3] border-[#d9cbbd] rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#28231f] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Cancel Order?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#756b63]">
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-[#d9cbbd] text-[#756b63] hover:bg-[#f3eadf]">
              Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderToCancel) cancelOrder.mutate(orderToCancel);
                setOrderToCancel(null);
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cannot Cancel Dialog (Preparing) */}
      <AlertDialog open={showCannotCancel} onOpenChange={setShowCannotCancel}>
        <AlertDialogContent className="bg-[#fffaf3] border-[#d9cbbd] rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#28231f] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#356b4f]" />
              Preparation in Progress
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#756b63] leading-relaxed">
              We're sorry, but our chefs have already begun preparing your meal with care.
              <br/><br/>
              Because the preparation is already underway, we are unable to cancel this order at this stage. We appreciate your understanding and hope you enjoy your delicious food!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowCannotCancel(false)}
              className="rounded-xl bg-[#356b4f] hover:bg-[#2d5a42] text-white px-8"
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Error Dialog */}
      <AlertDialog open={!!paymentError} onOpenChange={(open) => !open && setPaymentError(null)}>
        <AlertDialogContent className="bg-[#fffaf3] border-[#d9cbbd] rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#28231f] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Payment Error
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#756b63]">
              {paymentError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setPaymentError(null)}
              className="rounded-xl bg-[#356b4f] hover:bg-[#2d5a42] text-white"
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kitchen Cancellation Notification */}
      <AlertDialog open={!!kitchenCancelledOrder} onOpenChange={(open) => !open && setKitchenCancelledOrder(null)}>
        <AlertDialogContent className="bg-[#fffaf3] border-[#d9cbbd] rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#28231f] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Order Update
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#756b63] leading-relaxed">
              We're very sorry, but one of your orders (ID: #{kitchenCancelledOrder?.id.slice(0, 8)}) could not be fulfilled by our kitchen at this time and has been cancelled.
              <br/><br/>
              Your bill has been automatically adjusted. Please feel free to select another item from the menu or call our staff for assistance. We apologize for any inconvenience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setKitchenCancelledOrder(null)}
              className="rounded-xl bg-[#356b4f] hover:bg-[#2d5a42] text-white px-8"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
