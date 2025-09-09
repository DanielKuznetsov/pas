'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllOrders } from '@/app/actions/test-actions';
import supabase from '@/utils/supabase/client';

/* ----------------------------- money/date utils ---------------------------- */
const toNumber = (x) => (Number.isFinite(x) ? x : parseInt(x ?? 0, 10) || 0);
const centsToDollars = (v) => (parseFloat(v ?? 0) || 0) / 100;

const moneyFromCents = (cents) => {
  const n = centsToDollars(cents);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const formatCurrency = (dollars) => {
  const n = parseFloat(dollars ?? 0) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
};

const badgeClasses = (status) => {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';
  switch ((status || '').toLowerCase()) {
    case 'paid':
      return `${base} bg-green-50 text-green-700 ring-green-600/20`;
    case 'requires_payment':
    case 'pending':
      return `${base} bg-amber-50 text-amber-700 ring-amber-600/20`;
    case 'refunded':
    case 'canceled':
      return `${base} bg-gray-100 text-gray-600 ring-gray-500/20`;
    case 'failed':
      return `${base} bg-rose-50 text-rose-700 ring-rose-600/20`;
    default:
      return `${base} bg-slate-50 text-slate-700 ring-slate-600/20`;
  }
};

/* --------------------------- item shape normalizers ------------------------ */
const getItems = (order) => {
  if (Array.isArray(order?.items)) return order.items;
  if (Array.isArray(order?.items_snapshot?.items)) return order.items_snapshot.items;
  if (Array.isArray(order?.order_items)) return order.order_items;
  if (Array.isArray(order?.items_snapshot)) return order.items_snapshot;
  return [];
};

const getSubitems = (item) =>
  item?.subitems || item?.modifiers || item?.options || item?.children || item?.addons || [];

const readItemUnitPrice = (item) => {
  if (item?.unit_price_cents != null) return centsToDollars(item.unit_price_cents);
  if (item?.price_cents != null) return centsToDollars(item.price_cents);
  if (item?.unit_price != null) return parseFloat(item.unit_price) || 0; // dollars
  if (item?.price != null) return parseFloat(item.price) || 0; // dollars
  return 0;
};

const readItemTotal = (item) => {
  if (item?.total_price_cents != null) return centsToDollars(item.total_price_cents);
  if (item?.total_cents != null) return centsToDollars(item.total_cents);
  if (item?.total != null) return parseFloat(item.total) || 0; // dollars
  const qty = parseFloat(item?.qty ?? item?.quantity ?? 1) || 1;
  return readItemUnitPrice(item) * qty;
};

const readSubUnitPrice = (si) => {
  if (si?.unit_price_cents != null) return centsToDollars(si.unit_price_cents);
  if (si?.price_cents != null) return centsToDollars(si.price_cents);
  if (si?.unit_price != null) return parseFloat(si.unit_price) || 0;
  if (si?.price != null) return parseFloat(si.price) || 0;
  return 0;
};

const readSubTotal = (si) => {
  if (si?.total_price_cents != null) return centsToDollars(si.total_price_cents);
  if (si?.total_cents != null) return centsToDollars(si.total_cents);
  if (si?.total != null) return parseFloat(si.total) || 0;
  const q = parseFloat(si?.qty ?? si?.quantity ?? 1) || 1;
  return readSubUnitPrice(si) * q;
};

/* --------------------------- fulfillment + misc ---------------------------- */
const titleCase = (s) =>
  s ? String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : '';

const readFulfillmentType = (o) =>
  (o?.fulfillment_type ??
    o?.fulfillment?.type ??
    o?.delivery_type ??
    o?.order_type ??
    o?.type ??
    o?.shipping_method ??
    '')
    ?.toString()
    ?.toLowerCase();

const normalizePhone = (p) => String(p || '').replace(/[^\d]/g, '');
const prettyPhone = (p) => {
  const d = normalizePhone(p);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `+1 ${prettyPhone(d.slice(1))}`;
  return p || '—';
};

/* ----------------------------- visibility helper --------------------------- */
const isVisible = (o) => {
  const v =
    o?.visibility ??
    o?.visible ??
    o?.is_visible ??
    o?.isVisible ??
    (o?.hidden != null ? !o.hidden : true);
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return Boolean(v);
};

/* ----------------------------- payout (net) calc --------------------------- */
// "Net a restaurant will get" ≈ gross - processing - applicationFee - localFee
const netToRestaurantCents = (order) => {
  const pb = order?.payment_breakdown || {};
  const gross = toNumber(pb.gross ?? order?.total);
  const processing = toNumber(pb.processing ?? order?.stripe_fee);
  const app = toNumber(pb.applicationFee);
  const local = toNumber(pb.localFee ?? order?.local_fee);
  const net = gross - processing - app - local;
  return net;
};

/* -------------------------------- component -------------------------------- */
export default function AllOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // guests cache: { [guest_id]: {id, name, phone} }
  const [guests, setGuests] = useState({});

  // UI state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('created_at_desc');
  const [expanded, setExpanded] = useState(() => new Set());

  // realtime + chime + flash
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef(null);
  const refetchTimer = useRef(null);
  const [flashIds, setFlashIds] = useState(() => new Set());

  const flashOrder = (id, ms = 3000) => {
    if (!id) return;
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(
      () =>
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      ms
    );
  };

  /* ------------------------------- guests load ----------------------------- */
  const upsertGuests = (rows = []) =>
    setGuests((prev) => {
      const next = { ...prev };
      for (const g of rows) {
        if (!g?.id) continue;
        const name =
          g.name ?? g.full_name ?? [g.first_name, g.last_name].filter(Boolean).join(' ');
        const phone = g.phone ?? g.phone_number ?? g.mobile;
        next[g.id] = { id: g.id, name: (name || '').trim(), phone: phone || '' };
      }
      return next;
    });

  const fetchGuestsByIds = async (ids = []) => {
    const wanted = Array.from(new Set(ids.filter(Boolean)));
    if (wanted.length === 0) return;
    const unknown = wanted.filter((id) => !guests[id]);
    if (unknown.length === 0) return;

    const { data, error } = await supabase
      .from('guests')
      .select('id,name,phone')
      .in('id', unknown);

      console.log('NAME DATA', data)

    if (error) {
      console.error('fetchGuestsByIds error:', error);
      return;
    }
    upsertGuests(data || []);
  };

  const fetchGuestsForOrders = async (ordersArr = []) => {
    const ids = (ordersArr || []).map((o) => o?.guest_id).filter(Boolean);
    await fetchGuestsByIds(ids);
  };

  /* ----------------------------- data loaders ------------------------------ */
  const fetchOrders = async (opts = { setBusy: true }) => {
    try {
      if (opts.setBusy) setLoading(true);
      const data = await getAllOrders();
      const arr = Array.isArray(data) ? data : [];
      setOrders(arr);
      setErr(null);
      // hydrate guests for these orders
      await fetchGuestsForOrders(arr);
    } catch (e) {
      console.error(e);
      setErr('Failed to load orders');
    } finally {
      if (opts.setBusy) setLoading(false);
    }
  };

  /* -------------------------------- effects -------------------------------- */
  // initial load
  useEffect(() => {
    fetchOrders({ setBusy: true });
  }, []);

  // realtime via Supabase (orders + guests)
  useEffect(() => {
    const ordersChannel = supabase
      .channel('realtime:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          // chime
          if (soundOn && audioRef.current) {
            try {
              const snd = audioRef.current.cloneNode();
              snd.volume = 1;
              await snd.play();
            } catch {
              /* ignore autoplay blocks */
            }
          }

          // optimistic patch orders
          setOrders((prev) => {
            const next = [...prev];
            const id = payload?.new?.id ?? payload?.old?.id;
            const idx = next.findIndex((o) => o?.id === id);

            if (payload.eventType === 'INSERT') {
              if (idx >= 0) next[idx] = { ...next[idx], ...payload.new };
              else next.unshift(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              if (idx >= 0) next[idx] = { ...next[idx], ...payload.new };
              else next.unshift(payload.new);
              flashOrder(id);
            } else if (payload.eventType === 'DELETE') {
              if (idx >= 0) next.splice(idx, 1);
            }
            return next;
          });

          // ensure guest present for this order
          const gid = payload?.new?.guest_id ?? payload?.old?.guest_id;
          if (gid) fetchGuestsByIds([gid]);

          // reconcile after a short delay
          clearTimeout(refetchTimer.current);
          refetchTimer.current = setTimeout(() => fetchOrders({ setBusy: false }), 500);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    // optional: listen to guest updates too (live name/phone edits)
    const guestsChannel = supabase
      .channel('realtime:guests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        (payload) => {
          if (payload.new) upsertGuests([payload.new]);
          // flash any orders that belong to this guest ( UX hint )
          const gid = payload.new?.id ?? payload.old?.id;
          if (!gid) return;
          setOrders((prev) => {
            const affected = prev.filter((o) => o?.guest_id === gid).map((o) => o.id);
            affected.forEach((id) => flashOrder(id, 2000));
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(refetchTimer.current);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(guestsChannel);
    };
  }, [soundOn]);

  /* -------------------------------- filters -------------------------------- */
  const visibleOrders = useMemo(() => orders.filter(isVisible), [orders]);

  const uniqueStatuses = useMemo(() => {
    const s = new Set(
      visibleOrders.map((o) => (o?.payment_status || '').toLowerCase()).filter(Boolean)
    );
    return ['all', ...Array.from(s)];
  }, [visibleOrders]);

  // read display name/phone (prefer guests table)
  const displayName = (o) => (guests[o?.guest_id]?.name || '').trim();
  const displayPhone = (o) => guests[o?.guest_id]?.phone || '';

  const filtered = useMemo(() => {
    const qraw = query.trim();
    const q = qraw.toLowerCase();
    const qNum = Number(qraw.replace(/[^0-9.]/g, ''));
    const hasAmountQuery = !Number.isNaN(qNum) && qNum > 0;

    const byQuery = (o) => {
      if (!q) return true;

      const name = displayName(o);
      const phone = displayPhone(o);
      const phoneDigits = normalizePhone(phone);
      const totalCents = toNumber(o?.total);
      const totalDollarsStr = centsToDollars(totalCents).toFixed(2);

      const hay = [
        o?.id,
        o?.discount_code,
        o?.payment_status,
        readFulfillmentType(o),
        name,
        phone,
        phoneDigits,
        moneyFromCents(totalCents),
        totalDollarsStr,
        ...getItems(o).map((it) => it?.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (hasAmountQuery) {
        const centsFromQuery = Math.round(qNum * 100);
        if (totalCents === centsFromQuery) return true;
      }

      return hay.includes(q);
    };

    const byStatus =
      statusFilter === 'all'
        ? () => true
        : (o) => (o?.payment_status || '').toLowerCase() === statusFilter.toLowerCase();

    const out = visibleOrders.filter((o) => byQuery(o) && byStatus(o));

    switch (sortKey) {
      case 'created_at_asc':
        out.sort(
          (a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
        );
        break;
      case 'total_desc':
        out.sort((a, b) => toNumber(b?.total) - toNumber(a?.total));
        break;
      case 'total_asc':
        out.sort((a, b) => toNumber(a?.total) - toNumber(b?.total));
        break;
      case 'created_at_desc':
      default:
        out.sort(
          (a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
        );
    }
    return out;
  }, [visibleOrders, query, statusFilter, sortKey, guests]);

  const toggleExpanded = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="space-y-4 w-full">
      {/* loud/quick chime (place chime.mp3 in /public) */}
      <audio ref={audioRef} src="/chime.mp3" preload="auto" />

      {/* styles for flashing updated cards */}
      <style jsx global>{`
        @keyframes ring-flash {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.6);
          }
        }
        .flash-ring {
          animation: ring-flash 1s ease-in-out 3;
        }
      `}</style>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name, phone, order #, amount…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/50"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400/50"
        >
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400/50"
        >
          <option value="created_at_desc">Newest first</option>
          <option value="created_at_asc">Oldest first</option>
          <option value="total_desc">Total: high → low</option>
          <option value="total_asc">Total: low → high</option>
        </select>
      </div>

      {/* Live status + sound */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
            connected
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 bg-white text-slate-700'
          }`}
          title="Supabase realtime connection"
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {connected ? 'Live: Connected' : 'Live: Connecting…'}
        </span>

        <label className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={soundOn}
            onChange={(e) => setSoundOn(e.target.checked)}
          />
          <span className="text-slate-700">Sound</span>
        </label>
      </div>

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="mb-3 h-4 w-1/3 rounded bg-slate-200" />
              <div className="mb-2 h-3 w-1/2 rounded bg-slate-200" />
              <div className="mb-2 h-3 w-1/4 rounded bg-slate-200" />
              <div className="mt-4 h-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {err && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{err}</div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
          No matching orders.
        </div>
      )}

      {/* Grid */}
      {!loading && !err && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => {
            const items = getItems(order);
            const isOpen = expanded.has(order.id);
            const feesCents = toNumber(order?.stripe_fee) + toNumber(order?.local_fee);
            const fulfillment = titleCase(readFulfillmentType(order) || 'Unknown');
            const name = (guests[order?.guest_id]?.name || '').trim();
            const phone = guests[order?.guest_id]?.phone || '';
            const flashing = flashIds.has(order.id);

            return (
              <div
                key={order.id}
                className={`rounded-2xl bg-white p-4 shadow-sm border transition-shadow ${
                  flashing ? 'border-amber-400 flash-ring' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        Order #{String(order?.id || '').slice(0, 8)}
                      </span>
                      <span className={badgeClasses(order?.payment_status)}>
                        {order?.payment_status || 'unknown'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {fulfillment}
                      </span>
                    </div>

                    {/* Customer name + phone from guests table */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="truncate max-w-[12rem]" title={name || '—'}>
                        {name || '—'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-medium">{prettyPhone(phone)}</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">{fmtDateTime(order?.created_at)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Total</div>
                    <div className="text-base font-semibold text-slate-900">
                      {moneyFromCents(order?.total)}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    Subtotal:{' '}
                    <span className="font-medium">{moneyFromCents(order?.subtotal)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    Tax: <span className="font-medium">{moneyFromCents(order?.tax)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    Tip: <span className="font-medium">{moneyFromCents(order?.tip)}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    Fees: <span className="font-medium">{moneyFromCents(feesCents)}</span>
                  </div>

                  {(toNumber(order?.discount_pct) || toNumber(order?.discount_total)) ? (
                    <div className="col-span-2 rounded-lg bg-emerald-50 px-2 py-1 text-emerald-800">
                      Discount {order?.discount_code ? `(${order.discount_code})` : ''}:{' '}
                      <span className="font-medium">
                        {order?.discount_pct
                          ? `${order.discount_pct}%`
                          : moneyFromCents(order?.discount_total)}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Payment breakdown chips */}
                {order?.payment_breakdown && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-700">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 ring-1 ring-emerald-200 text-emerald-800">
                      Net to Restaurant: {moneyFromCents(netToRestaurantCents(order))}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                      Processing: {moneyFromCents(order.payment_breakdown.processing)}
                    </span>
                    {/* {toNumber(order.payment_breakdown.applicationFee) > 0 && (
                      <span className="rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                        App Fee: {moneyFromCents(order.payment_breakdown.applicationFee)}
                      </span>
                    )} */}
                    <span className="rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                      Tax: {moneyFromCents(order.payment_breakdown.tax)}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                      Local Fee: {moneyFromCents(order.payment_breakdown.localFee)}
                    </span>
                    {toNumber(order.payment_breakdown.discountTotal) > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-200">
                        Discount: {moneyFromCents(order.payment_breakdown.discountTotal)}
                      </span>
                    )}
                  </div>
                )}

                {/* Items Toggle */}
                <button
                  onClick={() => toggleExpanded(order.id)}
                  className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50"
                >
                  Items ({Array.isArray(items) ? items.length : 0}) {isOpen ? '▲' : '▼'}
                </button>

                {/* Items */}
                {isOpen && Array.isArray(items) && items.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {items.map((item, idx) => {
                      const subs = getSubitems(item);
                      const qty = parseFloat(item?.qty ?? item?.quantity ?? 1) || 1;
                      const unitDollars = readItemUnitPrice(item);
                      const lineTotalDollars = readItemTotal(item);

                      return (
                        <div
                          key={item?.id ?? `${order.id}-item-${idx}`}
                          className="rounded-xl border border-slate-200"
                        >
                          <div className="grid grid-cols-12 items-center gap-2 p-2">
                            <div className="col-span-6">
                              <div className="font-medium text-slate-900">
                                {item?.name || 'Item'}
                              </div>
                              {item?.notes && (
                                <div className="text-xs text-slate-500">{item.notes}</div>
                              )}
                            </div>
                            <div className="col-span-2 text-right text-sm text-slate-700">× {qty}</div>
                            <div className="col-span-2 text-right text-sm text-slate-700">
                              {formatCurrency(unitDollars)}
                            </div>
                            <div className="col-span-2 text-right text-sm font-semibold text-slate-900">
                              {formatCurrency(lineTotalDollars)}
                            </div>
                          </div>

                          {Array.isArray(subs) && subs.length > 0 && (
                            <div className="border-t border-slate-200 bg-slate-50 p-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Subitems
                              </div>
                              <ul className="mt-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                                {subs.map((si, sidx) => {
                                  const sQty = parseFloat(si?.qty ?? si?.quantity ?? 1) || 1;
                                  const sTotal = readSubTotal(si);
                                  return (
                                    <li
                                      key={si?.id ?? `${order.id}-item-${idx}-sub-${sidx}`}
                                      className="grid grid-cols-12 items-center gap-2 p-2 text-sm"
                                    >
                                      <div className="col-span-7 text-slate-700">
                                        {si?.name || si?.label || 'Option'}
                                      </div>
                                      <div className="col-span-3 text-right text-slate-600">× {sQty}</div>
                                      <div className="col-span-2 text-right font-medium text-slate-900">
                                        {formatCurrency(sTotal)}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
