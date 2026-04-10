// app/routes/orders.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import { useAuth } from "../context/authContext/authContext";
import { useUserProfile } from "../context/userContext/userProfile";
import {
  subscribeToAllOrders,
  approveOrder,
  declineOrder,
  scrapOrder,
  markOrderDelivered,
  deleteOrder,
} from "../services/orderService";
import { emailService } from "../services/emailService";
import type { Order } from "../types/types";
import OrderSection from "../components/orders/OrderSection";
import ConfirmDialog from "../components/orders/ConfirmDialog";
import AdminOrderForm from "../components/orders/AdminOrderForm";
import EditOrderModal from "../components/orders/EditOrderModal";
import "../styles/orders.css";
import { sanitizeText, MAX_LENGTHS } from "../utils/sanitize";

const PAGE_SIZE = 5;

function deliveryDateTime(order: Order): number {
  return new Date(
    `${new Date(order.deliveryDate).toDateString()} ${order.deliveryTime}`,
  ).getTime();
}

export default function Orders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const profile = useUserProfile();
  const isAdmin = user && profile?.role === "admin";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    type: "approve" | "decline" | "deliver" | "scrap" | "delete";
    order: Order;
  } | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [newPage, setNewPage] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [inactivePage, setInactivePage] = useState(0);
  const [discountPercent, setDiscountPercent] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      navigate("/404");
      return;
    }
    const unsubscribe = subscribeToAllOrders((all) => {
      setOrders(all);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin, authLoading, navigate]);

  const newOrders = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => deliveryDateTime(a) - deliveryDateTime(b));

  const activeOrders = orders
    .filter((o) => o.status === "active")
    .sort((a, b) => deliveryDateTime(a) - deliveryDateTime(b));

  const inactiveOrders = orders
    .filter(
      (o) =>
        o.status === "delivered" ||
        o.status === "declined" ||
        o.status === "scrapped",
    )
    .sort((a, b) => deliveryDateTime(b) - deliveryDateTime(a));

  const clampedNewPage = Math.min(
    newPage,
    Math.max(0, Math.ceil(newOrders.length / PAGE_SIZE) - 1),
  );
  const clampedActivePage = Math.min(
    activePage,
    Math.max(0, Math.ceil(activeOrders.length / PAGE_SIZE) - 1),
  );
  const clampedInactivePage = Math.min(
    inactivePage,
    Math.max(0, Math.ceil(inactiveOrders.length / PAGE_SIZE) - 1),
  );

  const pagedNewOrders = newOrders.slice(
    clampedNewPage * PAGE_SIZE,
    (clampedNewPage + 1) * PAGE_SIZE,
  );
  const pagedActiveOrders = activeOrders.slice(
    clampedActivePage * PAGE_SIZE,
    (clampedActivePage + 1) * PAGE_SIZE,
  );
  const pagedInactiveOrders = inactiveOrders.slice(
    clampedInactivePage * PAGE_SIZE,
    (clampedInactivePage + 1) * PAGE_SIZE,
  );

  const handleApprove = (order: Order) => {
    setConfirmState({ type: "approve", order });
  };

  const handleDecline = (order: Order) => {
    setDeclineNote("");
    setConfirmState({ type: "decline", order });
  };

  const handleDeliver = (order: Order) => {
    setConfirmState({ type: "deliver", order });
  };

  const handleScrap = (order: Order) => {
    setConfirmState({ type: "scrap", order });
  };

  const handleDelete = (order: Order) => {
    setConfirmState({ type: "delete", order });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const { type, order } = confirmState;
      if (type === "approve") {
        const parsedDiscount = parseFloat(discountPercent);
        const discount =
          !isNaN(parsedDiscount) && parsedDiscount > 0 && parsedDiscount < 100
            ? parsedDiscount
            : undefined;
        await approveOrder(order.id, discount);
        const { getOrderById } = await import("../services/orderService");
        const updatedOrder = await getOrderById(order.id);
        if (updatedOrder) {
          await emailService.sendOrderApprovedToCustomer(updatedOrder);
        }
      } else if (type === "decline") {
        const sanitizedNote =
          sanitizeText(declineNote, MAX_LENGTHS.declineNote) || undefined;
        await declineOrder(order.id, sanitizedNote);
        const { getOrderById } = await import("../services/orderService");
        const updatedOrder = await getOrderById(order.id);
        if (updatedOrder) {
          await emailService.sendOrderDeclinedToCustomer(
            updatedOrder,
            sanitizedNote,
          );
        }
      } else if (type === "deliver") {
        await markOrderDelivered(order.id);
      } else if (type === "scrap") {
        await scrapOrder(order.id);
      } else if (type === "delete") {
        await deleteOrder(order.id);
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
      setConfirmState(null);
      setDeclineNote("");
      setDiscountPercent("");
    }
  };

  const handleCancelConfirm = () => {
    if (actionLoading) return;
    setConfirmState(null);
    setDeclineNote("");
    setDiscountPercent("");
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1 className="orders-title">Orders</h1>
          </div>

          {loading ? (
            <div className="orders-loading">
              <svg className="orders-spinner" viewBox="0 0 50 50">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              <p>Loading orders…</p>
            </div>
          ) : (
            <div className="orders-sections">
              <div className="admin-new-order-row">
                <button
                  className="admin-new-order-btn"
                  onClick={() => setShowAdminForm(true)}
                >
                  + Make New Order
                </button>
              </div>
              <OrderSection
                title="New Orders"
                orders={pagedNewOrders}
                totalOrders={newOrders}
                emptyMessage="No new orders waiting for review."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
                onScrap={handleScrap}
                showApproveDecline={true}
                accentColor="#d9a84e"
                hidden={newOrders.length === 0}
                page={clampedNewPage}
                pageSize={PAGE_SIZE}
                onPageChange={setNewPage}
              />
              <OrderSection
                title="Active Orders"
                orders={pagedActiveOrders}
                totalOrders={activeOrders}
                emptyMessage="No active orders in progress."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
                onScrap={handleScrap}
                onEdit={handleEdit}
                showDeliverButton={true}
                accentColor="#6b7e3f"
                page={clampedActivePage}
                pageSize={PAGE_SIZE}
                onPageChange={setActivePage}
              />
              <OrderSection
                title="Inactive Orders"
                orders={pagedInactiveOrders}
                totalOrders={inactiveOrders}
                emptyMessage="No completed or declined orders yet."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
                onScrap={handleScrap}
                onDelete={handleDelete}
                accentColor="#8a8a7a"
                page={clampedInactivePage}
                pageSize={PAGE_SIZE}
                onPageChange={setInactivePage}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />

      {showAdminForm && (
        <AdminOrderForm
          onClose={() => setShowAdminForm(false)}
          onSuccess={() => setShowAdminForm(false)}
        />
      )}

      {confirmState?.type === "approve" &&
        (() => {
          const order = confirmState.order;
          const parsed = parseFloat(discountPercent);
          const validDiscount =
            !isNaN(parsed) && parsed > 0 && parsed < 100 ? parsed : null;
          const discountedTotal = validDiscount
            ? order.subtotal * (1 - validDiscount / 100)
            : null;

          return (
            <ConfirmDialog
              message={`Approve order ${order.orderCode} for ${order.customerName}?`}
              confirmLabel={actionLoading ? "Approving…" : "Yes, Approve"}
              onConfirm={handleConfirm}
              onCancel={handleCancelConfirm}
              extraContent={
                <div className="discount-wrapper">
                  <label className="discount-label">
                    Apply discount (optional):
                  </label>
                  <div className="discount-input-row">
                    <input
                      type="number"
                      className="discount-input"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="e.g. 10"
                      min="1"
                      max="99"
                    />
                    <span className="discount-symbol">%</span>
                  </div>

                  {validDiscount && discountedTotal !== null && (
                    <div className="discount-preview">
                      <p className="discount-preview-title">Price Preview</p>
                      <div className="discount-preview-items">
                        {order.items.map((item, i) =>
                          item.quantities.map((q, j) => {
                            const original = q.price * q.quantity;
                            const discounted =
                              original * (1 - validDiscount / 100);
                            return (
                              <div
                                key={`${i}-${j}`}
                                className="discount-preview-row"
                              >
                                <span className="discount-preview-name">
                                  {item.dishName}
                                  {q.size !== "single" && (
                                    <span className="discount-preview-size">
                                      {" "}
                                      ({q.size})
                                    </span>
                                  )}{" "}
                                  ×{q.quantity}
                                </span>
                                <span className="discount-preview-prices">
                                  <span className="discount-original">
                                    ${original.toFixed(2)}
                                  </span>
                                  <span className="discount-arrow">→</span>
                                  <span className="discount-new">
                                    ${discounted.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            );
                          }),
                        )}
                      </div>
                      <div className="discount-preview-total">
                        <span>Order Total</span>
                        <span className="discount-preview-total-values">
                          <span className="discount-original">
                            ${order.subtotal.toFixed(2)}
                          </span>
                          <span className="discount-arrow">→</span>
                          <span className="discount-new">
                            ${discountedTotal.toFixed(2)}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          );
        })()}
      {confirmState?.type === "decline" && (
        <ConfirmDialog
          message={`Decline order ${confirmState.order.orderCode} for ${confirmState.order.customerName}?`}
          confirmLabel={actionLoading ? "Declining…" : "Yes, Decline"}
          confirmDanger={true}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          extraContent={
            <div className="decline-note-wrapper">
              <label className="decline-note-label">
                Reason / note for customer (optional):
              </label>
              <textarea
                className="decline-note-input"
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                placeholder="e.g. Unavailable on that date, please choose another day."
                rows={3}
                maxLength={MAX_LENGTHS.declineNote}
              />
            </div>
          }
        />
      )}
      {confirmState?.type === "deliver" && (
        <ConfirmDialog
          message={`Mark order ${confirmState.order.orderCode} as delivered?`}
          confirmLabel={actionLoading ? "Saving…" : "Yes, Mark Delivered"}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}
      {confirmState?.type === "scrap" && (
        <ConfirmDialog
          message={`Scrap order ${confirmState.order.orderCode} for ${confirmState.order.customerName}? This will cancel the order and free up the time slot.`}
          confirmLabel={actionLoading ? "Scrapping…" : "Yes, Scrap Order"}
          confirmDanger={true}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}
      {confirmState?.type === "delete" && (
        <ConfirmDialog
          message={`Permanently delete order ${confirmState.order.orderCode}? This cannot be undone.`}
          confirmLabel={actionLoading ? "Deleting…" : "Yes, Delete"}
          confirmDanger={true}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
