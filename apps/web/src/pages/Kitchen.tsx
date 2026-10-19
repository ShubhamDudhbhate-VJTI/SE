import { useEffect, useRef, useState } from 'react';
import { useKitchenOrders } from '../hooks/useKitchenOrders';
import { useInventory } from '../hooks/useInventory';
import { OrderStatus, type OrderWithItems } from '@/contracts';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  Clock, CheckCircle2, AlertCircle, Utensils, ChefHat,
  Timer, Flame, BellRing, Package, Plus, Minus, Trash2, PlusCircle
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
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
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from '../components/ui/label';

gsap.registerPlugin(useGSAP);

function OrderCard({
  order,
  updateStatus,
  actionLabel,
  nextStatus,
  statusType,
  onCancelReq
}: {
  order: OrderWithItems,
  updateStatus: any,
  actionLabel: string,
  nextStatus: OrderStatus,
  statusType: 'placed' | 'preparing' | 'ready',
  onCancelReq?: (order: OrderWithItems) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(interval);
  }, []);
  
  useGSAP(() => {
    let mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(cardRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.5,
        ease: 'back.out(1.2)'
      });
    });
  }, { scope: cardRef });

  const timeSince = Math.max(0, Math.floor((now - order.createdAt) / 60000));
  const isUrgent = timeSince > 15 && statusType !== 'ready';

  return (
    <div ref={cardRef} className="group relative">
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-[#d9cbbd]/30 rounded-2xl -z-10 group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform" />
      <div className={cn(
        "relative rounded-2xl border-2 bg-[#fffaf3] transition-all duration-300",
        isUrgent ? "border-[#a3543e] ring-4 ring-[#a3543e]/10" : "border-[#d9cbbd] group-hover:border-[#756b63]"
      )}>
        {isUrgent && (
          <div className="absolute -top-3 -right-3 bg-[#a3543e] text-white p-1.5 rounded-full shadow-lg animate-bounce z-20">
            <Timer className="w-4 h-4" />
          </div>
        )}
        <div className={cn(
          "px-5 py-4 border-b-2 flex justify-between items-center",
          statusType === 'placed' ? "border-[#d9cbbd] bg-[#f3eadf]/30" :
          statusType === 'preparing' ? "border-[#a9c0d9]/50 bg-[#e7eff8]/30" :
          "border-[#d9c0a9]/50 bg-[#f8f0e7]/30"
        )}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#756b63]">Table Node</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-normal text-2xl text-[#28231f] leading-none">{order.tableName || '??'}</h3>
              <span className="text-[9px] font-mono text-[#a3543e] opacity-60">({order.id.slice(0, 4).toUpperCase()})</span>
            </div>
          </div>
          <div className="text-right">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              isUrgent ? "bg-[#a3543e] text-white border-[#a3543e]" : "bg-[#f3eadf] text-[#756b63] border-[#d9cbbd]"
            )}>
              <Clock className="w-3 h-3" /> {timeSince} min
            </div>
            <p className="text-[9px] font-mono text-[#756b63] mt-2 uppercase">#{order.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <ul className="space-y-3">
            {order.items.map(item => (
              <li key={item.id} className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#28231f] text-white text-xs font-black shadow-sm shrink-0">
                    {item.quantity}
                  </span>
                  <span className="text-[#28231f] text-lg leading-tight font-medium">
                    {item.name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {order.notes && (
            <div className="bg-[#fcf3d7] p-3 rounded-xl border border-[#d9c0a9] text-xs text-[#8c6d1f] flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="italic font-medium">"{order.notes}"</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-2 flex gap-3">
          {onCancelReq && (
            <button
              onClick={() => onCancelReq(order)}
              className="flex-1 h-12 rounded-xl border-2 border-[#d9a79b] text-[10px] font-black uppercase tracking-widest text-[#a3543e] hover:bg-[#f8e7e2] transition-colors active:scale-95 disabled:opacity-50"
              disabled={updateStatus.isPending}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => updateStatus.mutate({ orderId: order.id, status: nextStatus })}
            disabled={updateStatus.isPending}
            className={cn(
              "h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 text-white flex-grow flex items-center justify-center gap-2",
              statusType === 'placed' ? "bg-[#28231f] hover:bg-[#356b4f]" :
              statusType === 'preparing' ? "bg-[#2b4a7d] hover:bg-[#1e3a63]" :
              "bg-[#356b4f] hover:bg-[#28573f]"
            )}
          >
            {updateStatus.isPending ? 'Processing...' : (
              <>
                {actionLabel}
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        <div className="absolute -bottom-1 left-4 right-4 h-px border-b border-dashed border-[#d9cbbd] opacity-50" />
      </div>
    </div>
  );
}

function InventoryManager() {
  const { items, isLoading, addItem, deleteItem, adjustStock } = useInventory();
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'KG', minStockLevel: 0 });

  if (isLoading) return <div className="p-10 text-center">Loading Inventory...</div>;

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-normal text-[#28231f] flex items-center gap-3">
          <Package className="w-8 h-8 text-[#756b63]" />
          Kitchen Stock
        </h2>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#356b4f] hover:bg-[#28573f] text-white rounded-xl px-6">
              <PlusCircle className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#fffaf3] border-[#d9cbbd]">
            <DialogHeader>
              <DialogTitle>New Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Basmati Rice" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <select
                    className="w-full h-10 rounded-md border border-[#d9cbbd] bg-transparent px-3"
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  >
                    <option value="KG">KG</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Piece">Piece</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock Level</Label>
                <Input type="number" value={newItem.minStockLevel} onChange={e => setNewItem({...newItem, minStockLevel: Number(e.target.value)})} />
              </div>
              <Button
                onClick={() => {
                  addItem.mutate(newItem);
                  setNewItem({ name: '', quantity: 0, unit: 'KG', minStockLevel: 0 });
                }}
                className="w-full bg-[#28231f]"
              >
                Save Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 bg-white/40 rounded-[2.5rem] border border-[#d9cbbd] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items?.map(item => (
            <div key={item.id} className="bg-[#fffaf3] border-2 border-[#d9cbbd] rounded-2xl p-5 relative group">
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="absolute top-4 right-4 text-[#a3543e] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-medium text-[#28231f]">{item.name}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#756b63]">{item.unit}</span>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  item.quantity <= (item.minStockLevel || 5) ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  {item.quantity} {item.unit}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#d9cbbd]"
                  onClick={() => adjustStock.mutate({ id: item.id, data: { adjustment: -1, notes: 'Used in kitchen' } })}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#d9cbbd]"
                  onClick={() => adjustStock.mutate({ id: item.id, data: { adjustment: 1, notes: 'Restocked' } })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function KitchenPage() {
  const { orders, isLoading: ordersLoading, error, updateStatus } = useKitchenOrders();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [cancelOrder, setCancelOrder] = useState<OrderWithItems | null>(null);

  const placed = orders?.filter(o => o.status === OrderStatus.PLACED).sort((a, b) => a.createdAt - b.createdAt) || [];
  const preparing = orders?.filter(o => o.status === OrderStatus.PREPARING).sort((a, b) => a.createdAt - b.createdAt) || [];
  const ready = orders?.filter(o => o.status === OrderStatus.READY).sort((a, b) => a.createdAt - b.createdAt) || [];

  return (
    <div className="min-h-screen bg-[#f3eadf] text-[#28231f] font-sans relative flex flex-col h-screen overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-[-10%] top-[10%] h-[50%] w-[50%] rounded-full bg-[#ead7c8]/40 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] h-[50%] w-[50%] rounded-full bg-[#dce5d7]/60 blur-[120px]"></div>
      </div>

      <nav className="relative z-20 w-full border-b border-[#d9cbbd] bg-[#f3eadf]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-6">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-[#356b4f] p-2.5 text-white shadow-lg">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xl font-normal tracking-tight">Kitchen Terminal</span>
                </div>
              </div>

              <div className="flex bg-[#e8dccf] p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'orders' ? "bg-[#28231f] text-white shadow-md" : "text-[#756b63] hover:text-[#28231f]"
                  )}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'inventory' ? "bg-[#28231f] text-white shadow-md" : "text-[#756b63] hover:text-[#28231f]"
                  )}
                >
                  Inventory
                </button>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#756b63]">Status</span>
                <span className="text-sm font-bold text-[#356b4f]">Station Live</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 overflow-hidden p-6">
        {activeTab === 'inventory' ? (
          <InventoryManager />
        ) : ordersLoading ? (
          <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#fffaf3] border border-[#d9cbbd] rounded-3xl p-6 space-y-6">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-[#a3543e] mx-auto mb-4" />
            <h2 className="text-xl font-black text-[#a3543e]">Sync Error</h2>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: NEW ORDERS */}
            <div className="flex flex-col bg-[#fffaf3] border border-[#d9cbbd] rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-[#d9cbbd]/50 bg-[#f3eadf]/20 flex justify-between items-center">
                <h2 className="text-2xl flex items-center gap-3"><Flame className="w-6 h-6" /> New</h2>
                <div className="bg-[#28231f] text-white px-4 py-1 rounded-full text-xs">{placed.length}</div>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {placed.map(order => (
                    <OrderCard key={order.id} order={order} updateStatus={updateStatus} actionLabel="Accept" nextStatus={OrderStatus.PREPARING} statusType="placed" onCancelReq={setCancelOrder} />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Column 2: PREPARING */}
            <div className="flex flex-col bg-[#f8fbff] border border-[#a9c0d9] rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-[#a9c0d9]/50 bg-[#e7eff8]/20 flex justify-between items-center">
                <h2 className="text-2xl flex items-center gap-3"><Utensils className="w-6 h-6" /> In Prep</h2>
                <div className="bg-[#2b4a7d] text-white px-4 py-1 rounded-full text-xs">{preparing.length}</div>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {preparing.map(order => (
                    <OrderCard key={order.id} order={order} updateStatus={updateStatus} actionLabel="Ready" nextStatus={OrderStatus.READY} statusType="preparing" onCancelReq={setCancelOrder} />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Column 3: READY */}
            <div className="flex flex-col bg-[#fffaf3] border border-[#d9c0a9] rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-[#d9c0a9]/50 bg-[#f8f0e7]/20 flex justify-between items-center">
                <h2 className="text-2xl flex items-center gap-3"><BellRing className="w-6 h-6" /> Ready</h2>
                <div className="bg-[#356b4f] text-white px-4 py-1 rounded-full text-xs">{ready.length}</div>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {ready.map(order => (
                    <OrderCard key={order.id} order={order} updateStatus={updateStatus} actionLabel="Served" nextStatus={OrderStatus.SERVED} statusType="ready" />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </main>

      <AlertDialog open={!!cancelOrder} onOpenChange={(open) => !open && setCancelOrder(null)}>
        <AlertDialogContent className="bg-[#fffaf3] border-[#d9cbbd] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (cancelOrder) updateStatus.mutate({ orderId: cancelOrder.id, status: OrderStatus.CANCELLED });
              setCancelOrder(null);
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
