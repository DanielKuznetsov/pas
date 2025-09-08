'use server'

import { Webhook } from "svix";
import { headers } from "next/headers";
import supabase from "@/utils/supabase/client"
import { redirect } from "next/navigation";

export async function POST(req) {
    console.log("Webhook received");
    const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!CLERK_WEBHOOK_SECRET) {
        throw new Error(
            "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
        );
    }

    console.log("Headers:", Object.fromEntries(req.headers));

    const body = await req.text();

    console.log("Body:", body);
    const payload = JSON.parse(body);

    // Log incoming headers and body for debugging
    console.log("Headers:", req.headers);
    console.log("Body:", body);
    console.log("CLERK_WEBHOOK_SECRET:", CLERK_WEBHOOK_SECRET);

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // Log svix headers for debugging
    console.log("svix-id:", svix_id);
    console.log("svix-timestamp:", svix_timestamp);
    console.log("svix-signature:", svix_signature);

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Error occurred -- no svix headers", {
            status: 400,
        });
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET);

    let evt;

    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        console.error("Error verifying webhook:", err);
        return new Response("Error occurred", {
            status: 400,
        });
    }

    console.log("Event verified:", evt);

    if (evt.type === "user.created") {
        const user = evt.data;

        console.log("User created:", user);
        await saveUserDataToDatabase(user);
    }

    if (evt.type === "user.updated") {
        const user = evt.data;

        console.log("User updated:", user);
        await updateUserDataInDatabase(user);
    }

    if (evt.type === "user.deleted") {
        const user = evt.data;

        console.log("User deleted:", user);
        await deleteUserDataFromDatabase(user);
    }

    return new Response("", { status: 200 });
}

async function saveUserDataToDatabase(user) {
    console.log("Saving user data to database:", user);

    const id = user.id;
    const email = user.email_addresses[0].email_address;
    const firstName = user.first_name;
    const lastName = user.last_name;

    console.log("User ID:", id);
    console.log("User Email:", email);

    const { data, error } = await supabase
        .from("users")
        .insert([{ clerk_id: id, clerk_email: email, first_name: firstName, last_name: lastName }]);

    if (error) {
        console.error("Error inserting user into database:", error);
        throw new Error(error.message);
    }
}

async function updateUserDataInDatabase(user) {
    const id = user.id;
    const email = user.email_addresses[0].email_address;
    const firstName = user.first_name;
    const lastName = user.last_name;

    const { data, error } = await supabase
        .from("users")
        .update({ clerk_email: email, first_name: firstName, last_name: lastName, role: "restaurant" })
        .eq("clerk_id", id);

    if (error) {
        console.error("Error updating user in database:", error);
        throw new Error(error.message);
    }

    console.log("User updated successfully:", data);
}

async function deleteUserDataFromDatabase(user) {
    const id = user.id;
    console.log("Deleting user with ID: ", id);

    const { data, error } = await supabase
        .from("users")
        .delete()
        .eq("clerk_id", id);

    if (error) {
        console.error("Error marking user as deleted in database:", error);
        throw new Error(error.message);
    }

    console.log("User marked as deleted successfully:", data);
}