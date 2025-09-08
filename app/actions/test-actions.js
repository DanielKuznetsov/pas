'use server'

import Stripe from 'stripe'
import supabase from '@/utils/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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
    sellerAccountId = 'acct_1S5A7CCsCcObMHy7',
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
    const tipCut   = tipCents >= 100 ? Math.min(100, tipCents) : 0 // up to $1 from tip
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
    const submitNote = `Includes service fee $${(dinerFee/100).toFixed(2)} (${(dinerPct*100).toFixed(1)}%).`
  
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