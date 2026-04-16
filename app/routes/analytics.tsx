// app/routes/analytics.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/authContext/authContext";
import { useUserProfile } from "../context/userContext/userProfile";
import {
  getMonthlyAnalytics,
  getAllTimeAnalytics,
} from "../services/analyticsService";
import type {
  MonthlyAnalyticsData,
  AllTimeAnalyticsData,
} from "../services/analyticsService";
import Header from "../components/utils/header";
import Footer from "../components/utils/footer";
import "../styles/analytics.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent: "green" | "blue" | "gold" | "neutral";
}) {
  return (
    <div className={`analytics-kpi-card analytics-kpi-card--${accent}`}>
      <span className="analytics-kpi-label">{label}</span>
      <span className="analytics-kpi-value">{value}</span>
      {sub && <span className="analytics-kpi-sub">{sub}</span>}
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; count: number }>;
}) {
  if (items.length === 0)
    return <p className="analytics-empty">No data for this period.</p>;
  const max = items[0].count;
  return (
    <div className="analytics-bar-list">
      {items.map((item, i) => (
        <div key={item.label} className="analytics-bar-row">
          <span className="analytics-bar-rank">#{i + 1}</span>
          <span className="analytics-bar-label">{item.label}</span>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="analytics-bar-count">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function TopCustomersTable({
  customers,
}: {
  customers: MonthlyAnalyticsData["topCustomers"];
}) {
  if (customers.length === 0)
    return <p className="analytics-empty">No orders this month.</p>;
  return (
    <div className="analytics-customers-table">
      <div className="analytics-customers-header">
        <span>Customer</span>
        <span>Orders</span>
        <span>Total Spent</span>
      </div>
      {customers.map((c, i) => (
        <div key={c.name} className="analytics-customers-row">
          <span className="analytics-customers-rank-name">
            <span className="analytics-bar-rank">#{i + 1}</span>
            <span className="analytics-customers-name">{c.name}</span>
          </span>
          <span className="analytics-customers-orders">{c.orders}</span>
          <span className="analytics-customers-spent">
            {formatCurrency(c.spent)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentBreakdown({
  data,
}: {
  data: AllTimeAnalyticsData["paymentBreakdown"];
}) {
  if (data.length === 0)
    return <p className="analytics-empty">No payment data yet.</p>;
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <div className="analytics-payment-list">
      {data.map((d) => (
        <div key={d.label} className="analytics-payment-row">
          <span className="analytics-payment-label">{d.label}</span>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{ width: `${(d.count / total) * 100}%` }}
            />
          </div>
          <span className="analytics-payment-count">
            {d.count}{" "}
            <span className="analytics-payment-pct">
              ({Math.round((d.count / total) * 100)}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({
  data,
}: {
  data: Array<{ label: string; revenue: number }>;
}) {
  if (data.length === 0)
    return <p className="analytics-empty">No revenue data yet.</p>;
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="analytics-revenue-chart">
      {data.map((d) => (
        <div key={d.label} className="analytics-revenue-col">
          <span className="analytics-revenue-amount">
            {formatCurrency(d.revenue)}
          </span>
          <div className="analytics-revenue-bar-track">
            <div
              className="analytics-revenue-bar-fill"
              style={{ height: `${max > 0 ? (d.revenue / max) * 100 : 0}%` }}
            />
          </div>
          <span className="analytics-revenue-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBreakdown({
  breakdown,
}: {
  breakdown: MonthlyAnalyticsData["statusBreakdown"];
}) {
  const statuses: Array<{ key: keyof typeof breakdown; label: string }> = [
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "delivered", label: "Delivered" },
    { key: "declined", label: "Declined" },
    { key: "scrapped", label: "Scrapped" },
  ];
  return (
    <div className="analytics-status-grid">
      {statuses.map(({ key, label }) => (
        <div
          key={key}
          className={`analytics-status-pill analytics-status-pill--${key}`}
        >
          <span className="analytics-status-count">{breakdown[key] ?? 0}</span>
          <span className="analytics-status-name">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Monthly View ─────────────────────────────────────────────────────────────

function MonthlyView({
  year,
  month,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [data, setData] = useState<MonthlyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  useEffect(() => {
    setLoading(true);
    setData(null);
    getMonthlyAnalytics(year, month)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const revenuePercentDelta =
    data && data.revenueLastMonth > 0
      ? ((data.revenueThisMonth - data.revenueLastMonth) /
          data.revenueLastMonth) *
        100
      : null;

  return (
    <div className="analytics-view-section">
      <div className="analytics-month-nav">
        <button className="analytics-month-arrow" onClick={onPrev}>
          ‹
        </button>
        <h2 className="analytics-month-title">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          className="analytics-month-arrow"
          onClick={onNext}
          disabled={isCurrentMonth}
        >
          ›
        </button>
      </div>

      {loading ? (
        <div className="analytics-loading">Loading…</div>
      ) : !data ? (
        <div className="analytics-loading">Could not load analytics.</div>
      ) : (
        <>
          <div className="analytics-kpi-grid">
            <KpiCard
              label="Revenue This Month"
              value={formatCurrency(data.revenueThisMonth)}
              accent="green"
              sub={
                revenuePercentDelta !== null ? (
                  <span
                    className={
                      revenuePercentDelta >= 0
                        ? "analytics-delta--up"
                        : "analytics-delta--down"
                    }
                  >
                    {revenuePercentDelta >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(revenuePercentDelta).toFixed(1)}% vs last month (
                    {formatCurrency(data.revenueLastMonth)})
                  </span>
                ) : (
                  <span className="analytics-kpi-muted">
                    Last month: {formatCurrency(data.revenueLastMonth)}
                  </span>
                )
              }
            />
            <KpiCard
              label="Orders This Month"
              value={String(data.ordersThisMonth)}
              accent="gold"
              sub={
                <span
                  className={
                    data.ordersThisMonth >= data.ordersLastMonth
                      ? "analytics-delta--up"
                      : "analytics-delta--down"
                  }
                >
                  {data.ordersThisMonth >= data.ordersLastMonth ? "▲" : "▼"}{" "}
                  {Math.abs(data.ordersThisMonth - data.ordersLastMonth)} vs
                  last month ({data.ordersLastMonth})
                </span>
              }
            />
            <KpiCard
              label="Avg Order Value"
              value={formatCurrency(data.averageOrderValue)}
              accent="blue"
            />
          </div>

          <div className="analytics-section">
            <h3 className="analytics-section-title">Order Status Breakdown</h3>
            <StatusBreakdown breakdown={data.statusBreakdown} />
          </div>

          <div className="analytics-two-col">
            <div className="analytics-section">
              <h3 className="analytics-section-title">Most Popular Dishes</h3>
              <BarList
                items={data.topDishes.map((d) => ({
                  label: d.name,
                  count: d.count,
                }))}
              />
            </div>
            <div className="analytics-section">
              <h3 className="analytics-section-title">Top Customers</h3>
              <TopCustomersTable customers={data.topCustomers} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── All Time View ─────────────────────────────────────────────────────────────

function AllTimeView() {
  const [data, setData] = useState<AllTimeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTimeAnalytics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="analytics-view-section">
      {loading ? (
        <div className="analytics-loading">Loading…</div>
      ) : !data ? (
        <div className="analytics-loading">Could not load analytics.</div>
      ) : (
        <>
          <div className="analytics-kpi-grid">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              accent="green"
            />
            <KpiCard
              label="Total Orders"
              value={String(data.totalOrders)}
              accent="gold"
            />
            <KpiCard
              label="Avg Order Value"
              value={formatCurrency(data.averageOrderValue)}
              accent="blue"
            />
          </div>

          <div className="analytics-section analytics-section--wide">
            <h3 className="analytics-section-title">Revenue by Month</h3>
            <RevenueChart data={data.revenueByMonth} />
          </div>

          <div className="analytics-two-col">
            <div className="analytics-section">
              <h3 className="analytics-section-title">All-Time Top Dishes</h3>
              <BarList
                items={data.topDishes.map((d) => ({
                  label: d.name,
                  count: d.count,
                }))}
              />
            </div>
            <div className="analytics-section">
              <h3 className="analytics-section-title">Payment Methods</h3>
              <PaymentBreakdown data={data.paymentBreakdown} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const profile = useUserProfile();
  const navigate = useNavigate();

  const isAdmin = user && profile?.role === "admin";

  const now = new Date();
  const [viewMode, setViewMode] = useState<"monthly" | "alltime">("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [authLoading, isAdmin, navigate]);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    const now = new Date();
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="analytics-page">
        <div className="analytics-container">
          <div className="analytics-page-header">
            <h1 className="analytics-page-title">Business Analytics</h1>
            <div className="analytics-toggle">
              <button
                className={`analytics-toggle-btn ${viewMode === "monthly" ? "analytics-toggle-btn--active" : ""}`}
                onClick={() => setViewMode("monthly")}
              >
                Monthly
              </button>
              <button
                className={`analytics-toggle-btn ${viewMode === "alltime" ? "analytics-toggle-btn--active" : ""}`}
                onClick={() => setViewMode("alltime")}
              >
                All Time
              </button>
            </div>
          </div>

          {viewMode === "monthly" ? (
            <MonthlyView
              year={year}
              month={month}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          ) : (
            <AllTimeView />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
