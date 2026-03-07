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
  markOrderDelivered,
  markOrderViewedByAdmin,
} from "../services/orderService";
import { emailService } from "../services/emailService";
import type { Order } from "../types/types";
import "../styles/orders.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date, time: string): string {
  return `${formatDate(date)} at ${time}`;
}

function formatOrderDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function paymentLabel(method: string): string {
  if (method === "pay_on_delivery") return "Pay on Delivery";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmDanger?: boolean;
  extraContent?: React.ReactNode;
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  confirmDanger = false,
  extraContent,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        {extraContent}
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`confirm-ok-btn ${confirmDanger ? "danger" : "safe"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  onApprove: (order: Order) => void;
  onDecline: (order: Order) => void;
  onDeliver: (order: Order) => void;
  showDeliverButton: boolean;
  showApproveDecline: boolean;
}

function OrderRow({
  order,
  onApprove,
  onDecline,
  onDeliver,
  showDeliverButton,
  showApproveDecline,
}: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    setExpanded((prev) => !prev);
    // Mark as viewed when admin first expands a new order
    if (!expanded && order.isNewForAdmin) {
      await markOrderViewedByAdmin(order.id);
    }
  };

  const statusBadgeClass =
    {
      pending: "badge-pending",
      active: "badge-active",
      declined: "badge-declined",
      delivered: "badge-delivered",
    }[order.status] ?? "badge-pending";

  return (
    <div className={`order-row ${order.isNewForAdmin ? "order-row-new" : ""}`}>
      {/* ── Summary Row (always visible) ── */}
      <div className="order-row-summary">
        <div className="order-row-left">
          {order.isNewForAdmin && (
            <span className="new-dot" title="New order" />
          )}
          <span className="order-code">{order.orderCode}</span>
          <span className="order-customer">{order.customerName}</span>
          <span className="order-city">{order.deliveryAddress.city}</span>
        </div>

        <div className="order-row-right">
          <span className="order-delivery-time">
            {formatDateTime(order.deliveryDate, order.deliveryTime)}
          </span>
          <span
            className={`order-payment-badge ${order.paymentMethod === "pay_on_delivery" ? "payment-cod" : "payment-digital"}`}
          >
            {paymentLabel(order.paymentMethod)}
          </span>
          <span className={`order-status-badge ${statusBadgeClass}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>

          {/* Deliver button — visible inline on active rows */}
          {showDeliverButton && (
            <button
              className="deliver-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeliver(order);
              }}
              title="Mark as delivered"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </button>
          )}

          <button
            className={`order-expand-btn ${expanded ? "expanded" : ""}`}
            onClick={handleToggle}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="order-row-detail">
          <div className="order-detail-grid">
            {/* Customer Info */}
            <div className="order-detail-section">
              <h4>Customer</h4>
              <p>{order.customerName}</p>
              <p>{order.customerEmail}</p>
              <p>{order.customerPhone}</p>
            </div>

            {/* Delivery Info */}
            <div className="order-detail-section">
              <h4>Delivery</h4>
              <p>{formatDateTime(order.deliveryDate, order.deliveryTime)}</p>
              <p>{order.deliveryAddress.fullAddress}</p>
            </div>

            {/* Order Meta */}
            <div className="order-detail-section">
              <h4>Order Info</h4>
              <p>Placed: {formatOrderDate(order.orderDate)}</p>
              <p>Payment: {paymentLabel(order.paymentMethod)}</p>
              <p>
                Subtotal: <strong>${order.subtotal.toFixed(2)}</strong>
              </p>
              {order.adminNotes && (
                <p className="admin-notes-text">Note: {order.adminNotes}</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="order-items-list">
            <h4>Items Ordered</h4>
            {order.items.map((item, i) => (
              <div key={i} className="order-item-row">
                <div className="order-item-info">
                  <span className="order-item-name">{item.dishName}</span>
                  <span className="order-item-category">{item.category}</span>
                </div>
                <div className="order-item-quantities">
                  {item.quantities.map((q) => (
                    <span key={q.size} className="order-item-qty">
                      {q.size.charAt(0).toUpperCase() + q.size.slice(1)} ×
                      {q.quantity} — ${(q.price * q.quantity).toFixed(2)}
                    </span>
                  ))}
                </div>
                {item.specialInstructions && (
                  <span className="order-item-note">
                    Note: {item.specialInstructions}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Approve / Decline buttons for new (pending) orders */}
          {showApproveDecline && (
            <div className="order-actions">
              <button className="approve-btn" onClick={() => onApprove(order)}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Approve Order
              </button>
              <button className="decline-btn" onClick={() => onDecline(order)}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Decline Order
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface OrderSectionProps {
  title: string;
  orders: Order[];
  totalOrders: Order[];
  emptyMessage: string;
  onApprove: (order: Order) => void;
  onDecline: (order: Order) => void;
  onDeliver: (order: Order) => void;
  showDeliverButton?: boolean;
  showApproveDecline?: boolean;
  accentColor?: string;
  hidden?: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function OrderSection({
  title,
  orders,
  totalOrders,
  emptyMessage,
  onApprove,
  onDecline,
  onDeliver,
  showDeliverButton = false,
  showApproveDecline = false,
  accentColor = "#6b7e3f",
  hidden = false,
  page,
  pageSize,
  onPageChange,
}: OrderSectionProps) {
  if (hidden) return null;

  const totalPages = Math.ceil(totalOrders.length / pageSize);

  return (
    <section className="orders-section">
      <div
        className="orders-section-header"
        style={{ borderLeftColor: accentColor }}
      >
        <h2 className="orders-section-title">{title}</h2>
        <span className="orders-section-count">{totalOrders.length}</span>
      </div>

      {totalOrders.length === 0 ? (
        <p className="orders-empty">{emptyMessage}</p>
      ) : (
        <>
          <div className="orders-list">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onApprove={onApprove}
                onDecline={onDecline}
                onDeliver={onDeliver}
                showDeliverButton={showDeliverButton}
                showApproveDecline={showApproveDecline}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="orders-pagination">
              <button
                className="pagination-btn"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
              >
                ← Newer
              </button>
              <span className="pagination-info">
                {page + 1} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Older →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useUserProfile();
  const isAdmin = user && profile?.role === "admin";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    type: "approve" | "decline" | "deliver";
    order: Order;
  } | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const PAGE_SIZE = 5;
  const [newPage, setNewPage] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [inactivePage, setInactivePage] = useState(0);

  // Redirect non-admins
  useEffect(() => {
    if (user && profile && !isAdmin) {
      navigate("/");
    }
  }, [user, profile, isAdmin, navigate]);

  // Subscribe to real-time orders
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribeToAllOrders((allOrders) => {
      setOrders(allOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // ── Categorise orders ──
  // Reset to page 0 if current page would be out of bounds (handled per section)
  const newOrders = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => {
      const dateA = new Date(
        `${new Date(a.deliveryDate).toDateString()} ${a.deliveryTime}`,
      );
      const dateB = new Date(
        `${new Date(b.deliveryDate).toDateString()} ${b.deliveryTime}`,
      );
      return dateA.getTime() - dateB.getTime();
    });
  const activeOrders = orders
    .filter((o) => o.status === "active")
    .sort((a, b) => {
      const dateA = new Date(
        `${new Date(a.deliveryDate).toDateString()} ${a.deliveryTime}`,
      );
      const dateB = new Date(
        `${new Date(b.deliveryDate).toDateString()} ${b.deliveryTime}`,
      );
      return dateA.getTime() - dateB.getTime();
    });
  const inactiveOrders = orders
    .filter((o) => o.status === "declined" || o.status === "delivered")
    .sort((a, b) => {
      const dateA = new Date(
        `${new Date(a.deliveryDate).toDateString()} ${a.deliveryTime}`,
      );
      const dateB = new Date(
        `${new Date(b.deliveryDate).toDateString()} ${b.deliveryTime}`,
      );
      return dateB.getTime() - dateA.getTime();
    });

  // Clamp pages if orders shrink
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

  // ── Handlers ──

  // ── Handlers ──
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

  const handleConfirm = async () => {
    if (!confirmState) return;
    setActionLoading(true);

    try {
      const { type, order } = confirmState;

      if (type === "approve") {
        await approveOrder(order.id);
        const { getOrderById } = await import("../services/orderService");
        const updatedOrder = await getOrderById(order.id);
        if (updatedOrder) {
          await emailService.sendOrderApprovedToCustomer(updatedOrder);
        }
      } else if (type === "decline") {
        await declineOrder(order.id, declineNote.trim() || undefined);
        const { getOrderById } = await import("../services/orderService");
        const updatedOrder = await getOrderById(order.id);
        if (updatedOrder) {
          await emailService.sendOrderDeclinedToCustomer(
            updatedOrder,
            declineNote.trim() || undefined,
          );
        }
      } else if (type === "deliver") {
        await markOrderDelivered(order.id);
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
      setConfirmState(null);
      setDeclineNote("");
    }
  };

  const handleCancelConfirm = () => {
    if (actionLoading) return;
    setConfirmState(null);
    setDeclineNote("");
  };

  // ── Render ──
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1 className="orders-title">Orders</h1>
            <p className="orders-subtitle">
              {loading
                ? "Loading orders…"
                : `${orders.length} total order${orders.length !== 1 ? "s" : ""}`}
            </p>
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
              {/* NEW */}
              <OrderSection
                title="New Orders"
                orders={pagedNewOrders}
                totalOrders={newOrders}
                emptyMessage="No new orders waiting for review."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
                showApproveDecline={true}
                accentColor="#d9a84e"
                hidden={newOrders.length === 0}
                page={clampedNewPage}
                pageSize={PAGE_SIZE}
                onPageChange={setNewPage}
              />

              {/* ACTIVE */}
              <OrderSection
                title="Active Orders"
                orders={pagedActiveOrders}
                totalOrders={activeOrders}
                emptyMessage="No active orders in progress."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
                showDeliverButton={true}
                accentColor="#6b7e3f"
                page={clampedActivePage}
                pageSize={PAGE_SIZE}
                onPageChange={setActivePage}
              />

              {/* INACTIVE */}
              <OrderSection
                title="Inactive Orders"
                orders={pagedInactiveOrders}
                totalOrders={inactiveOrders}
                emptyMessage="No completed or declined orders yet."
                onApprove={handleApprove}
                onDecline={handleDecline}
                onDeliver={handleDeliver}
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

      {/* ── Confirm Dialogs ── */}
      {confirmState?.type === "approve" && (
        <ConfirmDialog
          message={`Approve order ${confirmState.order.orderCode} for ${confirmState.order.customerName}?`}
          confirmLabel={actionLoading ? "Approving…" : "Yes, Approve"}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

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
    </div>
  );
}
