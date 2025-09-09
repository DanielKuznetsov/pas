'use client';

import { useMemo, useState } from 'react';
import { createOrder, createOrderWithPaymentLink } from '@/app/actions/test-actions';

/* ---------- helpers ---------- */
const toCents = (n) => Math.round(Number(n || 0) * 100);
const fmt = (cents) =>
  (Number(cents || 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID; // Needs to be updated cause in production, the restaurant will have a different UUID
// const RESTAURANT_ID = 'a7a961dd-8711-4e00-85a0-e9c482492b24'; // Needs to be updated cause in production, the restaurant will have a different UUID
const SELLER_CONNECT_ID = process.env.NEXT_PUBLIC_SELLER_CONNECT_ID; // Can stay the same since we're working in the test environment

export default function NewOrderForm() {
  /* ---------------- customer ---------------- */
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal: '',
  });
  const updateCustomer = (k, v) => setCustomer((c) => ({ ...c, [k]: v }));

  /* ---------------- order meta ---------------- */
  const [fulfillment, setFulfillment] = useState('pickup'); // 'pickup' | 'delivery'
  const [discountPct, setDiscountPct] = useState('0');       // %
  const [tip, setTip] = useState('0.00');                    // dollars
  const [notes, setNotes] = useState('');

  /* ---------------- items ---------------- */
  const [items, setItems] = useState([
    { name: '', unitPrice: '', quantity: 1, prepNotes: '', subitems: [] },
  ]);
  const updateItem = (i, k, v) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () =>
    setItems((arr) => [
      ...arr,
      { name: '', unitPrice: '', quantity: 1, prepNotes: '', subitems: [] },
    ]);
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const addSubitem = (i) =>
    setItems((arr) =>
      arr.map((it, idx) =>
        idx === i ? { ...it, subitems: [...it.subitems, { name: '', price: '' }] } : it
      )
    );
  const updateSubitem = (i, si, k, v) =>
    setItems((arr) =>
      arr.map((it, idx) =>
        idx === i
          ? {
              ...it,
              subitems: it.subitems.map((s, sidx) => (sidx === si ? { ...s, [k]: v } : s)),
            }
          : it
      )
    );
  const removeSubitem = (i, si) =>
    setItems((arr) =>
      arr.map((it, idx) =>
        idx === i ? { ...it, subitems: it.subitems.filter((_, sidx) => sidx !== si) } : it
      )
    );

  /* ---------------- money: computed ---------------- */
  const TAX_RATE = 0.095;                // 9.5%
  const LOCAL_FEE_RATE = 0.075;          // 7.5%
  const LOCAL_FEE_CAP_CENTS = 995;       // $9.95
  const STRIPE_PCT = 0.029;
  const STRIPE_FIXED_CENTS = 30;

  const calc = useMemo(() => {
    const lines = items.map((it) => {
      const subCents = (it.subitems || []).reduce((s, si) => s + toCents(si.price), 0);
      const unitCents = toCents(it.unitPrice) + subCents;
      const qty = Math.max(0, Number(it.quantity || 0));
      return {
        name: it.name || 'Item',
        quantity: qty,
        unit_price_cents: unitCents,
        subitems: (it.subitems || []).map((si) => ({
          name: si.name || 'Option',
          price_cents: toCents(si.price),
        })),
        prep_notes: it.prepNotes || '',
        total_price_cents: unitCents * qty,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.total_price_cents, 0);

    // discount on subtotal
    const discPct = Math.max(0, Math.min(100, Number(discountPct || 0)));
    const discount = Math.round(subtotal * (discPct / 100));

    // tax on (subtotal - discount)
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * TAX_RATE);

    const tipCents = toCents(tip);

    // local fee 7.5% (cap $9.95) on (subtotal - discount)
    const localFee = Math.min(LOCAL_FEE_CAP_CENTS, Math.ceil(taxable * LOCAL_FEE_RATE));

    // base before processing fee
    const base = taxable + tax + tipCents + localFee;

    // processing fee computed with gross-up so it covers itself
    const processing = Math.ceil((base + STRIPE_FIXED_CENTS) / (1 - STRIPE_PCT)) - base;

    const total = base + processing;

    return {
      lines,
      subtotal,
      discountPct: discPct,
      discount,
      tax,
      tip: tipCents,
      localFee,
      processing,
      total,
    };
  }, [items, discountPct, tip]);

  // snapshot to store in orders.items_snapshot
  const itemsSnapshot = useMemo(
    () => ({
      items: calc.lines,
      notes: notes || '',
      fulfillment_type: fulfillment,
      customer: {
        name: customer.name,
        phone: customer.phone,
        ...(fulfillment === 'delivery'
          ? {
              address_line1: customer.address1,
              address_line2: customer.address2,
              city: customer.city,
              state: customer.state,
              postal_code: customer.postal,
            }
          : {}),
      },
    }),
    [calc.lines, fulfillment, notes, customer]
  );

  /* ---------------- actions ---------------- */
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save order only (no payment link)
  async function handleSaveOrder() {
    setLoading(true); setError(''); setLink('');
    try {
      const payload = {
        items_snapshot: itemsSnapshot,
        subtotal: calc.subtotal,
        discount_pct: calc.discountPct,
        discount_total: calc.discount,
        tax: calc.tax,
        tip: calc.tip,
        local_fee: calc.localFee,
        stripe_fee: calc.processing,
        total: calc.total,
        fulfillment_type: fulfillment,
        order_notes: notes,
        restaurant_id: RESTAURANT_ID,
        is_visible: false,
        customer_phone: customer.phone,
        customer_name: customer.name,
        customer_address: customer?.address1,
        customer_city: customer?.city,
        customer_state: customer?.state,
        customer_postal: customer?.postal,
      };
      await createOrder(payload);
    } catch (e) {
      setError(e.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  }

  // Create Stripe Payment Link + insert order
  async function handleCreateLink() {
    setLoading(true); setError(''); setLink('');
    try {
      // map UI items -> action shape (unit_price in dollars; subitems [{name, price}])
      const mappedItems = items.map((it) => ({
        name: it.name || 'Item',
        unit_price: Number(it.unitPrice || 0),
        quantity: Number(it.quantity || 1),
        subitems: (it.subitems || []).map((s) => ({
          name: s.name || 'Option',
          price: Number(s.price || 0),
        })),
        prep_notes: it.prepNotes || '',
      }));

      const res = await createOrderWithPaymentLink({
        restaurant_id: RESTAURANT_ID,
        sellerAccountId: SELLER_CONNECT_ID,
        customer: {
          first_name: customer.name,
          phone: customer.phone,
          address_line1: customer.address1 || undefined,
          address_line2: customer.address2 || undefined,
          city: customer.city || undefined,
          state: customer.state || undefined,
          postal_code: customer.postal || undefined,
        },
        fulfillment_type: fulfillment,
        items: mappedItems,
        tip: Number(tip || 0),
        discount_pct: Number(discountPct || 0),
        order_notes: notes || undefined,
      });

      setLink(res.url);
      console.log('Payment Link:', res.url, 'Order ID:', res.order_id);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to create payment link');
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Create Order</h1>

      {/* Customer */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Customer name"
            value={customer.name}
            onChange={(e) => updateCustomer('name', e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Phone"
            value={customer.phone}
            onChange={(e) => updateCustomer('phone', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillment === 'pickup'}
              onChange={() => setFulfillment('pickup')}
            />
            <span>Pick up</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="fulfillment"
              checked={fulfillment === 'delivery'}
              onChange={() => setFulfillment('delivery')}
            />
            <span>Delivery</span>
          </label>
        </div>

        {fulfillment === 'delivery' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="border rounded-lg px-3 py-2 sm:col-span-2"
              placeholder="Address line 1"
              value={customer.address1}
              onChange={(e) => updateCustomer('address1', e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2 sm:col-span-2"
              placeholder="Address line 2"
              value={customer.address2}
              onChange={(e) => updateCustomer('address2', e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="City"
              value={customer.city}
              onChange={(e) => updateCustomer('city', e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2"
              placeholder="State"
              value={customer.state}
              onChange={(e) => updateCustomer('state', e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2 sm:col-span-2"
              placeholder="Postal code"
              value={customer.postal}
              onChange={(e) => updateCustomer('postal', e.target.value)}
            />
          </div>
        )}
      </section>

      {/* Items */}
      <section className="rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Items</h2>
          <button className="text-sm px-3 py-1.5 border rounded-lg" onClick={addItem}>
            + Add item
          </button>
        </div>

        {items.map((it, i) => {
          const subCents = (it.subitems || []).reduce((s, si) => s + toCents(si.price), 0);
          const unit = toCents(it.unitPrice) + subCents;
          const qty = Math.max(0, Number(it.quantity || 0));
          const lineTotal = unit * qty;

          return (
            <div key={i} className="rounded-lg border p-4 space-y-3 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  className="border rounded-lg px-3 py-2 sm:col-span-2"
                  placeholder="Item name"
                  value={it.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  type="number"
                  step="0.01"
                  placeholder="Unit price"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                />
              </div>

              {/* subitems */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Subitems / modifiers</p>
                  <button
                    className="text-xs px-2 py-1 border rounded-lg"
                    onClick={() => addSubitem(i)}
                  >
                    + Add subitem
                  </button>
                </div>
                {(it.subitems || []).map((s, si) => (
                  <div key={si} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      className="border rounded-lg px-3 py-2 sm:col-span-2"
                      placeholder="Subitem name"
                      value={s.name}
                      onChange={(e) => updateSubitem(i, si, 'name', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        className="border rounded-lg px-3 py-2"
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={s.price}
                        onChange={(e) => updateSubitem(i, si, 'price', e.target.value)}
                      />
                      <button
                        className="text-xs px-2 py-1 border rounded-lg"
                        onClick={() => removeSubitem(i, si)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                className="border rounded-lg px-3 py-2 w-full"
                rows={2}
                placeholder="Prep notes (optional)"
                value={it.prepNotes}
                onChange={(e) => updateItem(i, 'prepNotes', e.target.value)}
              />

              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Line total</span>
                <span className="font-semibold">{fmt(lineTotal)}</span>
              </div>

              <div className="text-right">
                <button className="text-xs px-2 py-1 border rounded-lg" onClick={() => removeItem(i)}>
                  Remove item
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Charges */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium">Charges</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm mb-1">Discount (%)</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm mb-1">Tip ($)</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              type="number"
              step="0.01"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-neutral-50 p-4">
          <div className="flex justify-between py-1">
            <span>Subtotal</span>
            <span>{fmt(calc.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Discount ({calc.discountPct}%)</span>
            <span>-{fmt(calc.discount)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax (9.5%)</span>
            <span>{fmt(calc.tax)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Local fee (7.5% up to $9.95)</span>
            <span>{fmt(calc.localFee)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Processing (2.9% + $0.30)</span>
            <span>{fmt(calc.processing)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tip</span>
            <span>{fmt(calc.tip)}</span>
          </div>
          <div className="flex justify-between py-2 border-t mt-2 font-semibold">
            <span>Total</span>
            <span>{fmt(calc.total)}</span>
          </div>
        </div>

        <textarea
          className="border rounded-lg px-3 py-2 w-full"
          rows={3}
          placeholder="Order notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex flex-wrap gap-3 items-center">
          <button
            className="px-4 py-2 rounded-lg border"
            onClick={handleSaveOrder}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save order (no link)'}
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-black text-white"
            onClick={handleCreateLink}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Create payment link & save'}
          </button>

          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        {link && (
          <p className="text-sm mt-2">
            Payment Link:&nbsp;
            <a className="underline" href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
          </p>
        )}
      </section>

      {/* snapshot preview */}
      <details className="rounded-xl border p-5">
        <summary className="cursor-pointer font-medium">items_snapshot preview</summary>
        <pre className="text-xs bg-white p-3 rounded mt-3 overflow-auto">
          {JSON.stringify(itemsSnapshot, null, 2)}
        </pre>
      </details>
    </div>
  );
}
