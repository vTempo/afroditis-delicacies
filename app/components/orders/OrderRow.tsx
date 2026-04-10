// app/components/orders/OrderRow.tsx
import { useState } from "react";
import { markOrderViewedByAdmin } from "../../services/orderService";
import type { Order } from "../../types/types";

interface OrderRowProps {
  order: Order;
  onApprove: (order: Order) => void;
  onDecline: (order: Order) => void;
  onDeliver: (order: Order) => void;
  onScrap: (order: Order) => void;
  onDelete?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  showDeliverButton: boolean;
  showApproveDecline: boolean;
}

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

function isOrderExpired(order: Order): boolean {
  const [timePart, ampm] = order.deliveryTime.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hours = h;
  if (ampm === "PM" && h !== 12) hours += 12;
  if (ampm === "AM" && h === 12) hours = 0;

  const deliveryDateTime = new Date(order.deliveryDate);
  deliveryDateTime.setHours(hours, m, 0, 0);
  return deliveryDateTime < new Date();
}

function paymentLabel(method: string): string {
  if (method === "pay_on_delivery") return "Pay on Delivery";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export default function OrderRow({
  order,
  onApprove,
  onDecline,
  onDeliver,
  onScrap,
  onDelete,
  onEdit,
  showDeliverButton,
  showApproveDecline,
}: OrderRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    setExpanded((prev) => !prev);
    if (!expanded && order.isNewForAdmin) {
      await markOrderViewedByAdmin(order.id);
    }
  };

  const statusBadgeClass =
    {
      pending: "badge-pending",
      active: "badge-active",
      declined: "badge-declined",
      scrapped: "badge-scrapped",
      delivered: "badge-delivered",
    }[order.status] ?? "badge-pending";

  return (
    <div className={`order-row ${order.isNewForAdmin ? "order-row-new" : ""}`}>
      <div className="order-row-summary">
        <div className="order-row-left">
          {isOrderExpired(order) &&
            (order.status === "pending" || order.status === "active") && (
              <span
                className="expired-badge"
                title={
                  order.status === "pending"
                    ? "Delivery window has passed — consider declining this order"
                    : "Delivery window has passed — mark as delivered or decline"
                }
              >
                ⚠ Overdue
              </span>
            )}
          <span className="order-code">
            {order.orderCode}
            {order.isNewForAdmin && (
              <span className="new-dot" title="New order" />
            )}
          </span>
          <span className="order-customer">{order.customerName}</span>
          <span className="order-delivery-time">
            {formatDateTime(order.deliveryDate, order.deliveryTime)}
          </span>
          <span className="order-city">{order.deliveryAddress.city}</span>
        </div>

        <div className="order-row-right">
          <span
            className={`order-payment-badge ${
              order.paymentMethod === "pay_on_delivery"
                ? "payment-cod"
                : "payment-digital"
            }`}
          >
            {paymentLabel(order.paymentMethod)}
          </span>
          <span className={`order-status-badge ${statusBadgeClass}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          {onEdit && order.status === "active" && (
            <button
              className="deliver-btn"
              onClick={() => onEdit(order)}
              title="Edit order items"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {showDeliverButton && order.status === "active" && (
            <button
              className="deliver-btn"
              onClick={() => onDeliver(order)}
              title="Mark as delivered"
            >
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
            </button>
          )}
          {order.status === "active" && (
            <button
              className="scrap-btn"
              onClick={() => onScrap(order)}
              title="Scrap order"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              className="scrap-btn"
              onClick={() => onDelete(order)}
              title="Delete order"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
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

      {expanded && (
        <div className="order-row-detail">
          <div className="order-detail-grid">
            <div className="order-detail-section">
              <h4>Customer</h4>
              <p>{order.customerName}</p>
              <p>{order.customerEmail}</p>
              <p>{order.customerPhone}</p>
            </div>

            <div className="order-detail-section">
              <h4>Delivery</h4>
              <p>{formatDateTime(order.deliveryDate, order.deliveryTime)}</p>
              <p>{order.deliveryAddress.fullAddress}</p>
            </div>

            <div className="order-detail-section">
              <h4>Order Info</h4>
              <p>Placed: {formatOrderDate(order.orderDate)}</p>
              <p>Payment: {paymentLabel(order.paymentMethod)}</p>
              <p>
                Subtotal: <strong>${order.subtotal.toFixed(2)}</strong>
                {order.discountPercent && (
                  <>
                    {" "}
                    <span className="discount-badge">
                      {order.discountPercent}% off
                    </span>
                  </>
                )}
              </p>
              {order.adminNotes && (
                <p className="admin-notes-text">Note: {order.adminNotes}</p>
              )}
            </div>
          </div>

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

          {showApproveDecline && (
            <div className="order-actions">
              {!isOrderExpired(order) && (
                <button
                  className="approve-btn"
                  onClick={() => onApprove(order)}
                >
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
              )}
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
