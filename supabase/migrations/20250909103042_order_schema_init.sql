create table "public"."guests" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "first_name" text,
    "phone" text,
    "general_notes" text,
    "address_line1" text,
    "address_line2" text,
    "city" text,
    "state" text,
    "postal_code" bigint
);


alter table "public"."guests" enable row level security;

create table "public"."line_items" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "unit_price" bigint,
    "quantity" bigint,
    "subitems" json,
    "prep_notes" text,
    "total_price_per_item" bigint
);


alter table "public"."line_items" enable row level security;

create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "restaurant_id" uuid,
    "guest_id" uuid,
    "order_number" text,
    "fulfillment_type" text,
    "items_snapshot" json,
    "subtotal" bigint,
    "tax" bigint,
    "tip" bigint,
    "local_fee" bigint,
    "stripe_fee" bigint,
    "discount_code" text,
    "discount_pct" text,
    "discount_total" bigint,
    "total" bigint,
    "order_notes" text,
    "payment_status" text,
    "is_visible" boolean,
    "stripe_payment_link" text,
    "stripe_link_id" text,
    "payment_breakdown" json
);


alter table "public"."orders" enable row level security;

create table "public"."restaurants" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "phone" text,
    "email" text,
    "manager_phone" text,
    "manager_email" text,
    "address_line1" text,
    "address_line2" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "hours" json,
    "owner_clerk_id" uuid,
    "notes" text
);


alter table "public"."restaurants" enable row level security;

CREATE UNIQUE INDEX customers_pkey ON public.guests USING btree (id);

CREATE UNIQUE INDEX order_items_pkey ON public.line_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX restaurants_pkey ON public.restaurants USING btree (id);

alter table "public"."guests" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."line_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."restaurants" add constraint "restaurants_pkey" PRIMARY KEY using index "restaurants_pkey";

alter table "public"."orders" add constraint "orders_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES guests(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_guest_id_fkey";

alter table "public"."orders" add constraint "orders_restaurant_id_fkey" FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_restaurant_id_fkey";

alter table "public"."restaurants" add constraint "restaurants_owner_clerk_id_fkey" FOREIGN KEY (owner_clerk_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."restaurants" validate constraint "restaurants_owner_clerk_id_fkey";

grant delete on table "public"."guests" to "anon";

grant insert on table "public"."guests" to "anon";

grant references on table "public"."guests" to "anon";

grant select on table "public"."guests" to "anon";

grant trigger on table "public"."guests" to "anon";

grant truncate on table "public"."guests" to "anon";

grant update on table "public"."guests" to "anon";

grant delete on table "public"."guests" to "authenticated";

grant insert on table "public"."guests" to "authenticated";

grant references on table "public"."guests" to "authenticated";

grant select on table "public"."guests" to "authenticated";

grant trigger on table "public"."guests" to "authenticated";

grant truncate on table "public"."guests" to "authenticated";

grant update on table "public"."guests" to "authenticated";

grant delete on table "public"."guests" to "service_role";

grant insert on table "public"."guests" to "service_role";

grant references on table "public"."guests" to "service_role";

grant select on table "public"."guests" to "service_role";

grant trigger on table "public"."guests" to "service_role";

grant truncate on table "public"."guests" to "service_role";

grant update on table "public"."guests" to "service_role";

grant delete on table "public"."line_items" to "anon";

grant insert on table "public"."line_items" to "anon";

grant references on table "public"."line_items" to "anon";

grant select on table "public"."line_items" to "anon";

grant trigger on table "public"."line_items" to "anon";

grant truncate on table "public"."line_items" to "anon";

grant update on table "public"."line_items" to "anon";

grant delete on table "public"."line_items" to "authenticated";

grant insert on table "public"."line_items" to "authenticated";

grant references on table "public"."line_items" to "authenticated";

grant select on table "public"."line_items" to "authenticated";

grant trigger on table "public"."line_items" to "authenticated";

grant truncate on table "public"."line_items" to "authenticated";

grant update on table "public"."line_items" to "authenticated";

grant delete on table "public"."line_items" to "service_role";

grant insert on table "public"."line_items" to "service_role";

grant references on table "public"."line_items" to "service_role";

grant select on table "public"."line_items" to "service_role";

grant trigger on table "public"."line_items" to "service_role";

grant truncate on table "public"."line_items" to "service_role";

grant update on table "public"."line_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."restaurants" to "anon";

grant insert on table "public"."restaurants" to "anon";

grant references on table "public"."restaurants" to "anon";

grant select on table "public"."restaurants" to "anon";

grant trigger on table "public"."restaurants" to "anon";

grant truncate on table "public"."restaurants" to "anon";

grant update on table "public"."restaurants" to "anon";

grant delete on table "public"."restaurants" to "authenticated";

grant insert on table "public"."restaurants" to "authenticated";

grant references on table "public"."restaurants" to "authenticated";

grant select on table "public"."restaurants" to "authenticated";

grant trigger on table "public"."restaurants" to "authenticated";

grant truncate on table "public"."restaurants" to "authenticated";

grant update on table "public"."restaurants" to "authenticated";

grant delete on table "public"."restaurants" to "service_role";

grant insert on table "public"."restaurants" to "service_role";

grant references on table "public"."restaurants" to "service_role";

grant select on table "public"."restaurants" to "service_role";

grant trigger on table "public"."restaurants" to "service_role";

grant truncate on table "public"."restaurants" to "service_role";

grant update on table "public"."restaurants" to "service_role";

create policy "enable all actions"
on "public"."guests"
as permissive
for all
to public
using (true)
with check (true);


create policy "enable all actions"
on "public"."orders"
as permissive
for all
to public
using (true);


create policy "enable all actions"
on "public"."restaurants"
as permissive
for all
to public
using (true)
with check (true);



