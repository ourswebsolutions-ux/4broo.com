// Notification content: WhatsApp text + premium HTML/plain-text email, built from the
// stored order snapshot in the customer's checkout language. Server-only.
// Every customer-provided value is HTML-escaped; nothing here is sent anywhere.
import "server-only";
import { siteConfig } from "../../config/site.js";
import { getDirection, isSupportedLocale } from "../../i18n/config.js";
import { localizeHref } from "../../i18n/navigation.js";
import { getTranslator } from "../../i18n/server.js";
import { formatMoney } from "../currency/money.js";
import { escapeHtml } from "../services/email.js";
import { getPublicContact } from "../settings/index.js";

const money = (value, currency = "PKR") => formatMoney(String(value), currency);
const absoluteUrl = (path) => new URL(path, siteConfig.url).toString();
const imageUrl = (src) => (!src ? null : /^https?:\/\//.test(src) ? src : absoluteUrl(src));

export const trackingUrl = (order) => absoluteUrl(localizeHref(`/account/orders/${order.orderNumber}`, order.locale));

function itemLines(order) {
  return order.items.map((item) => {
    const options = [item.size, item.color].filter(Boolean).join(" / ");
    return `• ${item.productName}${options ? ` (${options})` : ""} × ${item.quantity}`;
  });
}

const deliveryLine = (order) => [order.city, order.country].filter(Boolean).join(", ");

/** The newest note attached to a status (e.g. the courier tracking number on SHIPPED). */
function statusNote(order, status) {
  const events = (order.statusEvents ?? []).filter((event) => event.status === status && event.note);
  return events.at(-1)?.note ?? null;
}

/**
 * Customer message for an event.
 * @param {object} order   order with items, payment, statusEvents
 * @param {{ type: "ORDER_CONFIRMATION"|"ORDER_STATUS"|"PAYMENT_CONFIRMED", status?: string }} event
 */
export async function buildCustomerMessage(order, event) {
  const locale = isSupportedLocale(order.locale) ? order.locale : "en";
  const [t, contact] = await Promise.all([getTranslator(locale), getPublicContact()]);
  const total = money(order.total, order.currency);
  const method = order.payment ? t(`order.methods.${order.payment.method}`) : "";
  const paymentStatus = order.payment ? t(`order.paymentStatuses.${order.payment.status}`) : "";
  const tracking = event.status === "SHIPPED" ? statusNote(order, "SHIPPED") : null;
  const url = trackingUrl(order);

  const headline =
    event.type === "ORDER_CONFIRMATION" ? t("notify.placedTitle") : event.type === "PAYMENT_CONFIRMED" ? t("notify.paymentTitle") : t(`notify.status.${event.status}`);
  const intro =
    event.type === "ORDER_CONFIRMATION"
      ? t("notify.placedText")
      : event.type === "PAYMENT_CONFIRMED"
        ? t("notify.paymentText", { amount: total })
        : event.status === "CANCELLED"
          ? t("notify.cancelledText")
          : null;
  const subject =
    event.type === "ORDER_CONFIRMATION"
      ? t("notify.subjectPlaced", { number: order.orderNumber })
      : event.type === "PAYMENT_CONFIRMED"
        ? t("notify.subjectPayment", { number: order.orderNumber })
        : t("notify.subjectStatus", { number: order.orderNumber, status: t(`order.steps.${event.status}`) });

  // ── WhatsApp (plain text, WhatsApp *bold*) ──
  const full = event.type !== "ORDER_STATUS";
  const whatsapp = [
    `*${t("notify.brand")}*`,
    "",
    headline,
    intro,
    "",
    `${t("notify.order")}: #${order.orderNumber}`,
    full ? `${t("notify.customer")}: ${order.customerName}` : null,
    ...(full ? ["", `${t("notify.items")}:`, ...itemLines(order)] : []),
    "",
    `${t("notify.total")}: ${total}${order.deliveryFeeConfirmed ? "" : ` (${t("notify.deliveryTbc")})`}`,
    order.payment ? `${t("notify.payment")}: ${method} — ${paymentStatus}` : null,
    full ? `${t("notify.delivery")}: ${deliveryLine(order)}` : null,
    tracking ? `${t("notify.tracking")}: ${tracking}` : null,
    "",
    `${t("notify.track")}:`,
    url,
    "",
    t("notify.thanks"),
    t("notify.tagline"),
  ]
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const email = buildEmail({ order, t, locale, subject, headline, intro, tracking, url, method, paymentStatus, total, contact });
  return { whatsapp, email };
}

/** Premium, responsive, table-based email (inline styles for client compatibility). */
function buildEmail({ order, t, locale, subject, headline, intro, tracking, url, method, paymentStatus, total, contact }) {
  const dir = getDirection(locale);
  const align = dir === "rtl" ? "right" : "left";
  const opposite = dir === "rtl" ? "left" : "right";
  const e = escapeHtml;
  const logo = absoluteUrl("/brand/logo-full.png");
  const year = new Date().getFullYear();
  const fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const serif = "Georgia, 'Times New Roman', serif";
  // Business contact from admin settings (support email / WhatsApp / website).
  const channels = [
    contact.whatsappNumber && { label: t("pages.contactLabels.whatsapp"), value: `+${contact.whatsappNumber}`, href: `https://wa.me/${contact.whatsappNumber}` },
    contact.email && { label: t("pages.contactLabels.email"), value: contact.email, href: `mailto:${contact.email}` },
  ].filter(Boolean);
  const website = contact.websiteUrl ?? siteConfig.url;
  const websiteLabel = contact.websiteLabel ?? siteConfig.domain;

  const rows = order.items
    .map((item) => {
      const img = imageUrl(item.imageUrl);
      const options = [item.size, item.color].filter(Boolean).join(" · ");
      return `<tr>
  <td width="72" valign="top" style="padding:16px 0;border-bottom:1px solid #e4e1da;">${img ? `<img src="${e(img)}" width="64" height="80" alt="" style="display:block;width:64px;height:80px;object-fit:cover;background:#ece9e2;border:0;">` : `<div style="width:64px;height:80px;background:#ece9e2;"></div>`}</td>
  <td valign="top" style="padding:16px 12px;border-bottom:1px solid #e4e1da;font-family:${fontFamily};font-size:14px;line-height:1.5;color:#0b0b0a;text-align:${align};">${e(item.productName)}<br><span style="font-size:12px;color:#6b6b66;">${e(options)}${options ? " · " : ""}${e(t("notify.qty", { count: item.quantity }))}</span></td>
  <td valign="top" style="padding:16px 0;border-bottom:1px solid #e4e1da;font-family:${fontFamily};font-size:14px;color:#0b0b0a;text-align:${opposite};white-space:nowrap;" dir="ltr">${e(money(item.lineTotal, order.currency))}</td>
</tr>`;
    })
    .join("");

  const line = (label, value, strong = false) => `<tr>
  <td style="padding:6px 0;font-family:${fontFamily};font-size:${strong ? 15 : 13}px;color:${strong ? "#0b0b0a" : "#6b6b66"};text-align:${align};${strong ? "letter-spacing:2px;text-transform:uppercase;font-weight:600;" : ""}">${e(label)}</td>
  <td style="padding:6px 0;font-family:${fontFamily};font-size:${strong ? 18 : 13}px;color:#0b0b0a;text-align:${opposite};white-space:nowrap;${strong ? "font-weight:600;" : ""}" dir="ltr">${e(value)}</td>
</tr>`;

  const html = `<!doctype html>
<html lang="${e(locale)}" dir="${dir}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<title>${e(subject)}</title>
<style>
  @media (max-width:620px){ .container{width:100%!important} .px{padding-left:24px!important;padding-right:24px!important} .h1{font-size:28px!important} }
</style>
</head>
<body style="margin:0;padding:0;background:#ece9e2;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(headline)} #${e(order.orderNumber)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ece9e2;">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#f5f3ee;" dir="${dir}">
    <tr><td align="center" style="background:#0b0b0a;padding:36px 24px 28px;">
      <img src="${e(logo)}" width="132" alt="4 BRO" style="display:block;width:132px;height:auto;border:0;">
      <p style="margin:18px 0 0;font-family:${fontFamily};font-size:10px;letter-spacing:4px;color:#c9a24d;">CREATE YOUR LEGACY</p>
    </td></tr>
    <tr><td class="px" style="padding:48px 48px 8px;text-align:${align};">
      <p style="margin:0 0 14px;font-family:${fontFamily};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a7b33;">${e(t("notify.order"))} #<span dir="ltr">${e(order.orderNumber)}</span></p>
      <h1 class="h1" style="margin:0 0 18px;font-family:${serif};font-weight:400;font-size:32px;line-height:1.2;color:#0b0b0a;">${e(headline)}</h1>
      <p style="margin:0 0 8px;font-family:${fontFamily};font-size:15px;line-height:1.7;color:#3b3b38;">${e(t("notify.emailGreeting", { name: order.customerName.split(" ")[0] }))}</p>
      ${intro ? `<p style="margin:0;font-family:${fontFamily};font-size:15px;line-height:1.7;color:#3b3b38;">${e(intro)}</p>` : ""}
      ${tracking ? `<p style="margin:18px 0 0;padding:14px 16px;border:1px solid #0b0b0a;font-family:${fontFamily};font-size:14px;color:#0b0b0a;">${e(t("notify.tracking"))}: <strong>${e(tracking)}</strong></p>` : ""}
    </td></tr>
    <tr><td class="px" style="padding:28px 48px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td colspan="3" style="padding:0 0 4px;border-bottom:1px solid #0b0b0a;font-family:${fontFamily};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0b0b0a;text-align:${align};">${e(t("notify.items"))}</td></tr>
        ${rows}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
        ${line(t("notify.subtotal"), money(order.subtotal, order.currency))}
        ${line(t("notify.delivery"), order.deliveryFeeConfirmed ? money(order.deliveryFee, order.currency) : t("notify.deliveryTbc"))}
        <tr><td colspan="2" style="padding:6px 0 0;border-top:1px solid #e4e1da;"></td></tr>
        ${line(t("notify.total"), total, true)}
      </table>
    </td></tr>
    <tr><td class="px" style="padding:24px 48px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" width="50%" style="padding:16px 0;border-top:1px solid #e4e1da;font-family:${fontFamily};font-size:13px;line-height:1.7;color:#3b3b38;text-align:${align};">
            <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0b0b0a;">${e(t("notify.payment"))}</span><br>${e(method)}<br><span style="color:#9a7b33;">${e(paymentStatus)}</span>
          </td>
          <td valign="top" width="50%" style="padding:16px 0;border-top:1px solid #e4e1da;font-family:${fontFamily};font-size:13px;line-height:1.7;color:#3b3b38;text-align:${align};">
            <span style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0b0b0a;">${e(t("notify.deliverTo"))}</span><br>${e(order.customerName)}<br>${e(order.address)}<br>${e([order.city, order.postalCode].filter(Boolean).join(" "))}<br>${e(order.country)}
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td class="px" align="center" style="padding:32px 48px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#0b0b0a;">
        <a href="${e(url)}" style="display:inline-block;padding:16px 36px;font-family:${fontFamily};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#f5f3ee;text-decoration:none;">${e(t("notify.track"))}</a>
      </td></tr></table>
      <p style="margin:28px 0 0;font-family:${serif};font-style:italic;font-size:16px;color:#3b3b38;">${e(t("notify.thanks"))}</p>
    </td></tr>
    <tr><td class="px" style="background:#0b0b0a;padding:28px 48px;text-align:center;">
      <p style="margin:0 0 10px;font-family:${fontFamily};font-size:12px;line-height:1.7;color:#b8b5ad;">${e(t("notify.emailFooter"))}</p>
      ${channels.length ? `<p style="margin:0 0 10px;font-family:${fontFamily};font-size:12px;line-height:1.7;color:#b8b5ad;">${channels.map((c) => `${e(c.label)}: <a href="${e(c.href)}" style="color:#c9a24d;text-decoration:none;" dir="ltr">${e(c.value)}</a>`).join(" &nbsp;·&nbsp; ")}</p>` : ""}
      <p style="margin:0;font-family:${fontFamily};font-size:11px;color:#77746d;">${e(t("notify.emailRights", { year }))} · <a href="${e(website)}" style="color:#c9a24d;text-decoration:none;">${e(websiteLabel)}</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    t("notify.brand"),
    "",
    headline,
    intro,
    tracking ? `${t("notify.tracking")}: ${tracking}` : null,
    "",
    `${t("notify.order")}: #${order.orderNumber}`,
    `${t("notify.items")}:`,
    ...itemLines(order),
    "",
    `${t("notify.subtotal")}: ${money(order.subtotal, order.currency)}`,
    `${t("notify.delivery")}: ${order.deliveryFeeConfirmed ? money(order.deliveryFee, order.currency) : t("notify.deliveryTbc")}`,
    `${t("notify.total")}: ${total}`,
    `${t("notify.payment")}: ${method} — ${paymentStatus}`,
    `${t("notify.deliverTo")}: ${order.customerName}, ${order.address}, ${[order.city, order.postalCode].filter(Boolean).join(" ")}, ${order.country}`,
    "",
    `${t("notify.track")}: ${url}`,
    "",
    t("notify.thanks"),
    t("notify.tagline"),
    ...(channels.length ? ["", t("notify.emailFooter"), ...channels.map((c) => `${c.label}: ${c.value}`)] : []),
  ]
    .filter((value) => value !== null)
    .join("\n");

  return { subject, html, text };
}

/** Admin alert for a new order (English, like the admin area). */
export function buildAdminNewOrderMessage(order) {
  const adminUrl = absoluteUrl(`/admin/orders/${order.id}`);
  const method = order.payment?.method === "COD" ? "Cash on delivery" : order.payment?.method ?? "—";
  const lines = [
    "*4 BRO — NEW ORDER*",
    "",
    `Order: #${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: +${order.customerPhone}`,
    order.whatsappNumber && order.whatsappNumber !== order.customerPhone ? `WhatsApp: +${order.whatsappNumber}` : null,
    `Email: ${order.customerEmail}`,
    "",
    "Items:",
    ...itemLines(order),
    "",
    `Total: ${money(order.total, order.currency)}${order.deliveryFeeConfirmed ? "" : " (delivery fee to be confirmed)"}`,
    `Payment: ${method} — ${order.payment?.status ?? "—"}`,
    `Delivery: ${order.address}, ${[order.city, order.postalCode].filter(Boolean).join(" ")}, ${order.country}`,
    order.customerNote ? `Note: ${order.customerNote}` : null,
    "",
    `Manage: ${adminUrl}`,
  ].filter((line) => line !== null);
  const text = lines.join("\n");
  const e = escapeHtml;
  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#ece9e2;font-family:Helvetica,Arial,sans-serif;color:#0b0b0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#f5f3ee;">
<tr><td style="background:#0b0b0a;padding:20px 28px;color:#c9a24d;font-size:11px;letter-spacing:4px;">4 BRO · NEW ORDER</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;">#${e(order.orderNumber)}</h1>
<pre style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;">${e(lines.slice(3, -2).join("\n"))}</pre>
<p style="margin:24px 0 0;"><a href="${e(adminUrl)}" style="display:inline-block;background:#0b0b0a;color:#f5f3ee;padding:14px 28px;font-size:12px;letter-spacing:3px;text-decoration:none;">OPEN IN ADMIN</a></p>
</td></tr></table></body></html>`;
  return { whatsapp: text, email: { subject: `New 4 BRO Order — #${order.orderNumber}`, html, text } };
}
