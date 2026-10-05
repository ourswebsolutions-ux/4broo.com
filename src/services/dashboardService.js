// Admin overview figures — every number is a live database aggregate; nothing is estimated.
// Revenue counts only payments recorded as PAID (COD once an admin records the cash as
// received, online payments only after the provider confirms them). Server-only.
import "server-only";
import { getDb } from "../lib/db.js";

export const LOW_STOCK_THRESHOLD = 5;
const OPEN_STATUSES = ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED"];
const DAY = 24 * 60 * 60 * 1000;

const sumOf = (aggregate) => String(aggregate._sum.amount ?? "0");

export async function getAdminDashboard() {
  const db = getDb();
  const since30 = new Date(Date.now() - 30 * DAY);

  const [
    ordersByStatus,
    orders30,
    paidAll,
    paid30,
    expectedCod,
    productsByStatus,
    lowStock,
    lowStockCount,
    outOfStockCount,
    customers,
    customers30,
    failedNotifications,
    recentOrders,
    codAwaitingCash,
  ] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.order.count({ where: { createdAt: { gte: since30 } } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
    db.payment.aggregate({ where: { status: "PAID", paidAt: { gte: since30 } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { method: "COD", status: "PENDING", order: { status: { not: "CANCELLED" } } }, _sum: { amount: true }, _count: { _all: true } }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
    db.product.findMany({
      where: { status: "PUBLISHED", stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 6,
      select: { id: true, name: true, stock: true, sku: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
    }),
    db.product.count({ where: { status: "PUBLISHED", stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
    db.product.count({ where: { status: "PUBLISHED", stock: 0 } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since30 } } }),
    db.notification.count({ where: { status: "FAILED" } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, orderNumber: true, customerName: true, total: true, currency: true, status: true, createdAt: true, payment: { select: { method: true, status: true } }, _count: { select: { items: true } } },
    }),
    db.payment.count({ where: { method: "COD", status: "PENDING", order: { status: "DELIVERED" } } }),
  ]);

  const orderCount = (status) => ordersByStatus.find((row) => row.status === status)?._count._all ?? 0;
  const productCount = (status) => productsByStatus.find((row) => row.status === status)?._count._all ?? 0;

  return {
    orders: {
      total: ordersByStatus.reduce((sum, row) => sum + row._count._all, 0),
      new: orderCount("NEW"),
      open: OPEN_STATUSES.reduce((sum, status) => sum + orderCount(status), 0),
      delivered: orderCount("DELIVERED"),
      cancelled: orderCount("CANCELLED"),
      last30Days: orders30,
    },
    revenue: {
      collected: sumOf(paidAll),
      paidPayments: paidAll._count._all,
      last30Days: sumOf(paid30),
      expectedCod: sumOf(expectedCod),
      expectedCodOrders: expectedCod._count._all,
      codAwaitingCash,
    },
    products: {
      published: productCount("PUBLISHED"),
      draft: productCount("DRAFT"),
      archived: productCount("ARCHIVED"),
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      lowStockItems: lowStock.map((product) => ({ id: product.id, name: product.name, sku: product.sku, stock: product.stock, image: product.images[0]?.url ?? null })),
    },
    customers: { total: customers, last30Days: customers30 },
    failedNotifications,
    recentOrders,
  };
}
