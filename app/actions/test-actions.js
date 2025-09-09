'use server'

import Stripe from 'stripe'
import supabase from '@/utils/supabase/client'
import { auth } from '@clerk/nextjs/server'

// --- Stripe ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// --- constants (cents math) ---
const TAX_PCT = 0.095                   // 9.5% sales tax
const DINER_PCT = 0.075                 // 7.5% local/diner fee
const DINER_CAP = 995                   // cap at $9.95
const STRIPE_PCT = 0.029
const STRIPE_FIXED = 30                 // 30¢

const toCents = n => Math.round(Number(n || 0) * 100)
const fromCents = c => (c / 100).toFixed(2)
const digits = s => (s || '').replace(/\D/g, '')

export async function testAction() {
  const { data, error } = await supabase.from('todos').insert({
    name: 'Buy groceries'
  })

  const { data: todos, error: todosError } = await getTodos()

  if (error) {
    return { error: error.message }
  }

  return { data, message: 'Data inserted successfully', todos }
}

export async function getTodos() {
  const { data, error } = await supabase.from('todos').select('*')

  if (error) {
    return { error: error.message }
  }

  return { data, message: 'Data fetched successfully' }
}

/**
 * amount: seller subtotal (USD) 
 * tip: tip (USD)
 * dinerPct: your platform fee on subtotal (e.g. 0.075 = 7.5%)
 * tipCut rule: if tip >= $1.00, take up to $1.00 from the tip; else $0.
 */
export async function createLink({
  title = 'Custom Order',
  amount,
  tip = 0,
  sellerAccountId = 'acct_1S5A7CCsCcObMHy7', // TODO: change this to the restaurant's Stripe Connect account id
  dinerPct = 0.075,
}) {
  const toCents = (n) => Math.round(Number(n) * 100)
  const subtotal = toCents(amount)
  const tipCents = toCents(tip)

  // Stripe fee assumption (US cards)
  const FEE_PCT = 0.029
  const FEE_FIXED = 30 // 30¢

  // Platform fees
  const dinerFee = Math.ceil(subtotal * dinerPct)         // your % on subtotal
  const tipCut = tipCents >= 100 ? Math.min(100, tipCents) : 0 // up to $1 from tip
  const applicationFee = dinerFee + tipCut                 // goes to your platform

  // Seller should net: subtotal + (tip - tipCut)
  const sellerNetDesired = subtotal + (tipCents - tipCut)

  // Solve for total the buyer pays (so seller nets desired after Stripe fees + your fee)
  const gross = Math.ceil((sellerNetDesired + applicationFee + FEE_FIXED) / (1 - FEE_PCT))

  // Visible "processing fee" line so the receipt itemizes it
  const processing = gross - subtotal - tipCents

  // Build visible line items
  const line_items = [
    {
      price_data: {
        currency: 'usd',
        unit_amount: subtotal,
        product_data: { name: 'Subtotal' },
      },
      quantity: 1,
    },
  ]
  if (tipCents > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: tipCents,
        product_data: { name: 'Tip' },
      },
      quantity: 1,
    })
  }
  if (processing > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        unit_amount: processing,
        product_data: { name: 'Processing fee (2.9% + $0.30)' },
      },
      quantity: 1,
    })
  }

  // Clarify service fee in the note (kept by your platform)
  const submitNote = `Includes service fee $${(dinerFee / 100).toFixed(2)} (${(dinerPct * 100).toFixed(1)}%).`

  const link = await stripe.paymentLinks.create(
    {
      line_items,
      custom_text: { submit: { message: submitNote } },
      application_fee_amount: applicationFee,                     // your revenue
      after_completion: process.env.NEXT_PUBLIC_BASE_URL
        ? { type: 'redirect', redirect: { url: process.env.NEXT_PUBLIC_BASE_URL } }
        : undefined,
    },
    { stripeAccount: sellerAccountId } // DIRECT charge on connected account
  )

  return {
    url: link.url,
    id: link.id,
    breakdown: {
      subtotal, tip: tipCents, processing, dinerFee, applicationFee, gross,
    },
  }
}

/**
 * payload:
 * {
 *   restaurant_id: string,
 *   sellerAccountId?: string,  // Stripe Connect account id for the restaurant
 *   customer: {
 *     name?: string,
 *     phone: string,
 *     address_line1?, address_line2?, city?, state?, postal_code?
 *   },
 *   fulfillment_type: 'pickup' | 'delivery',
 *   items: [{ name, unit_price, quantity, subitems?: [{ name, price }], prep_notes? }],
 *   tip?: number,                      // dollars
 *   discount_pct?: number,             // e.g. 10 for 10%
 *   discount_code?: string,
 *   order_notes?: string
 * }
 */

export async function createOrderWithPaymentLink(payload) {
  // ---- 1) build itemized lines & subtotal (items only) ----
  const items = payload.items || [];

  // Per item we fold subitem prices into the unit price, and we add a description listing them.
  const itemLines = items.map((it) => {
    const subPerUnit = (it.subitems || []).reduce((s, si) => s + toCents(si.price), 0);
    const perUnitCents = toCents(it.unit_price) + subPerUnit;
    const qty = Math.max(1, Number(it.quantity || 1));
    const descParts = [];
    if (it.subitems?.length) {
      descParts.push(
        ...it.subitems.map((si) => `• ${si.name} (+$${fromCents(toCents(si.price))})`)
      );
    }
    if (it.prep_notes) descParts.push(`Notes: ${it.prep_notes}`);

    return {
      stripeLine: {
        price_data: {
          currency: 'usd',
          unit_amount: perUnitCents,
          product_data: {
            name: it.name || 'Item',
            description: descParts.join('\n') || undefined,
          },
        },
        quantity: qty,
      },
      lineTotal: perUnitCents * qty,
    };
  });

  const itemsSubtotal = itemLines.reduce((s, l) => s + l.lineTotal, 0);

  // ---- 2) discounts/taxes/fees ----
  const discountPct = Math.max(0, Number(payload.discount_pct || 0));
  const discountTotal = Math.round(itemsSubtotal * (discountPct / 100));
  const discountedSubtotal = Math.max(0, itemsSubtotal - discountTotal);

  const tax = Math.round(discountedSubtotal * TAX_PCT);
  const tipCents = toCents(payload.tip);
  const localFee = Math.min(DINER_CAP, Math.ceil(discountedSubtotal * DINER_PCT)); // your platform fee

  // The seller should net (items - discount + tax + full tip)
  const sellerNetDesired = discountedSubtotal + tax + tipCents;

  // Your platform receives localFee using application_fee_amount
  const applicationFee = localFee;

  // Gross-up so the customer covers Stripe fees + your application fee
  const gross = Math.ceil((sellerNetDesired + applicationFee + STRIPE_FIXED) / (1 - STRIPE_PCT));
  const processing = gross - sellerNetDesired - applicationFee;

  // ---- 3) find-or-create guest by phone (optional but per your flow) ----
  const phone = digits(payload.customer?.phone);
  let guest_id = null;
  if (phone) {
    const { data: existing, error: selErr } = await supabase
      .from('guests').select('id').eq('phone', phone).limit(1).maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (existing) {
      guest_id = existing.id;
    } else {
      const { data: created, error: insErr } = await supabase
        .from('guests')
        .insert({
          name: payload.customer?.name || null,
          phone,
          address_line1: payload.customer?.address_line1 || null,
          address_line2: payload.customer?.address_line2 || null,
          city: payload.customer?.city || null,
          state: payload.customer?.state || null,
          postal_code: payload.customer?.postal_code || null,
        })
        .select('id').single();
      if (insErr) throw new Error(insErr.message);
      guest_id = created.id;
    }
  }

  // ---- 4) Stripe Payment Link: itemize everything visibly ----
  const line_items = [
    ...itemLines.map((l) => l.stripeLine),
    ...(tax ? [{
      price_data: { currency: 'usd', unit_amount: tax, product_data: { name: 'Tax (9.5%)' } },
      quantity: 1,
    }] : []),
    ...(tipCents ? [{
      price_data: { currency: 'usd', unit_amount: tipCents, product_data: { name: 'Tip' } },
      quantity: 1,
    }] : []),
    ...(localFee ? [{
      price_data: { currency: 'usd', unit_amount: localFee, product_data: { name: 'Local fee (platform)' } },
      quantity: 1,
    }] : []),
    ...(processing ? [{
      price_data: {
        currency: 'usd',
        unit_amount: processing,
        product_data: { name: 'Processing fee (2.9% + $0.30)' },
      },
      quantity: 1,
    }] : []),
  ];

  const discountNote =
    discountPct > 0 ? `Includes discount ${discountPct}% (-$${fromCents(discountTotal)}). ` : '';
  const submitNote =
    `${discountNote}Local fee $${fromCents(localFee)} (7.5% cap $9.95) is paid by the customer.`;

  const stripeArgs = {
    line_items,
    custom_text: { submit: { message: submitNote } },
    application_fee_amount: applicationFee, // routes localFee to your platform
    after_completion: process.env.NEXT_PUBLIC_BASE_URL
      ? { type: 'redirect', redirect: { url: process.env.NEXT_PUBLIC_BASE_URL } }
      : undefined,
  };

  const link = await stripe.paymentLinks.create(
    stripeArgs,
    payload.sellerAccountId ? { stripeAccount: payload.sellerAccountId } : undefined
  );

  // ---- 5) Insert order in Supabase ----
  const orderRow = {
    restaurant_id: payload.restaurant_id,
    guest_id,
    fulfillment_type: payload.fulfillment_type || 'pickup',
    items_snapshot: {
      items: payload.items,
      discount_pct: discountPct,
      discount_total: discountTotal,
    },
    subtotal: discountedSubtotal,   // after discount
    tax,
    tip: tipCents,
    local_fee: localFee,
    stripe_fee: processing,
    discount_code: payload.discount_code || null,
    discount_pct: discountPct ? String(discountPct) : null,
    discount_total: discountTotal,
    total: gross,
    order_notes: payload.order_notes || null,
    payment_status: 'unpaid',
    is_visible: false,
    stripe_payment_link: link.url,
    stripe_link_id: link.id,
    payment_breakdown: { gross, processing, applicationFee, tax, localFee, discountTotal },
  };

  console.log('ORDER ROW', orderRow)

  const { data: inserted, error: insErr } = await supabase
    .from('orders')
    .insert(orderRow)
    .select('id')
    .single();
  if (insErr) throw new Error(insErr.message);

  return { url: link.url, order_id: inserted.id };
}

export async function getAllOrders() {
  const { userId } = await auth();
  console.log('USER ID', userId)

  // Find users with this clerk_id
  const { data: user, error: usersError } = await supabase.from('users').select('id').eq('clerk_id', userId);
  console.log('USER', user)

  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants').select('id').eq('owner_clerk_id', user[0].id);
  console.log('RESTAURANT DATA', restaurant)
  
  const restaurantIds = restaurant.map(restaurant => restaurant.id);

  const { data: allOrders, error: allOrdersError } = await supabase.from('orders').select('*').in('restaurant_id', restaurantIds);
  if (allOrdersError) throw new Error(allOrdersError.message);

  console.log('ALL ORDERS', allOrders[0].items_snapshot.items)
  return allOrders;
}