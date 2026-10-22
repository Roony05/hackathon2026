// Shared story data for the Sealed Tender demo.
// Every company, person and figure here is fictional.

// TideCloak tag "dob" = technical envelope, tag "cc" = financial envelope.
// The tags and their _tide_<tag>.self(en|de)crypt roles are unchanged from the playground realm.
export const TENDER = {
  id: "LT-2026-117",
  buyer: "Lotus Industries JSC (fictional)",
  title: "Supply & installation of 40 CNC machining centres",
  titleVi: "Cung cấp và lắp đặt 40 máy phay CNC",
  method: "Single-stage, two-envelope sealed bidding",
  methodVi: "Đấu thầu một giai đoạn, hai túi hồ sơ",
  estimateVND: 15000000000,
  deadline: "22 Oct 2026, 17:00",
  quorum: { required: 3, total: 5 },
};

export const FIELDS = {
  dob: {
    tag: "dob",
    en: "Technical envelope · Delivery time (days)",
    vi: "Túi kỹ thuật · Thời gian giao hàng (ngày)",
    short: "Delivery time (days)",
    placeholder: "e.g. 45",
  },
  cc: {
    tag: "cc",
    en: "Financial envelope · Bid price (VND)",
    vi: "Túi tài chính · Giá dự thầu (VNĐ)",
    short: "Bid price (VND)",
    placeholder: "e.g. 12450000000",
  },
};

// Keyed by the TideCloak usernames seeded in app/api/createUsers/route.js.
// Only demouser's envelopes are real TideCloak-encrypted data; the rest are simulated bids.
export const VENDORS = {
  demouser:  { name: "Vendor A · Your company", nameVi: "Nhà thầu A · Công ty của bạn", you: true },
  testuser1: { name: "Vendor B · Orchid Machinery",      deliveryDays: 60, priceVND: 13900000000 },
  testuser2: { name: "Vendor C · Heron Precision",       deliveryDays: 50, priceVND: 14250000000 },
  testuser3: { name: "Vendor D · Lantern Tooling",       deliveryDays: 75, priceVND: 12980000000 },
  testuser4: { name: "Vendor E · Bamboo Industrial",     deliveryDays: 40, priceVND: 14700000000 },
};

// Same order as ADMIN_NAMES in app/admin/page.js; index 0 is the person using the demo.
export const COMMITTEE = [
  { name: "You",   role: "Procurement lead",   roleVi: "Trưởng phòng mua sắm" },
  { name: "Alice", role: "Finance (CFO office)", roleVi: "Tài chính" },
  { name: "Ben",   role: "Technical lead",     roleVi: "Trưởng kỹ thuật" },
  { name: "Carlos", role: "Internal audit",    roleVi: "Kiểm toán nội bộ" },
  { name: "Dana",  role: "Independent member", roleVi: "Thành viên độc lập" },
];

export const formatVND = (value) => {
  const n = Number(String(value).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("en-US")} ₫` : String(value ?? "");
};

// Secondary Vietnamese line under an English heading or callout.
export function Vi({ children, className = "" }) {
  return <span className={`block text-sm italic text-gray-500 ${className}`}>{children}</span>;
}
