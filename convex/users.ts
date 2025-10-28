import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateUsername } from "./contentFilter";

export const findUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const upsertUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Extract image from Clerk identity - it can come from picture_url or profileImageUrl
    const clerkImage = 
      (identity.picture_url as string) || 
      (identity as any)?.profileImageUrl ||
      undefined;

    // CONTENT FILTER: Validate username if provided
    let validatedUsername: string | undefined = undefined;
    if (identity.username) {
      try {
        validatedUsername = validateUsername(identity.username as string);
      } catch (error) {
        throw new Error(`Invalid username: ${error instanceof Error ? error.message : 'contains inappropriate content'}`);
      }
    }

    // Check if user exists by token
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed - always update image to ensure it's current
      const updatedFields: Parameters<typeof ctx.db.patch>[1] = {
        name: identity.name,
        email: identity.email,
        clerkUsername: validatedUsername,
        image: clerkImage ?? undefined,
      };

      // Only patch if something has changed
      const hasChanges = 
        existingUser.name !== updatedFields.name ||
        existingUser.email !== updatedFields.email ||
        existingUser.clerkUsername !== updatedFields.clerkUsername ||
        existingUser.image !== updatedFields.image;

      if (hasChanges) {
        await ctx.db.patch(existingUser._id, updatedFields);
      }
      
      // Return updated user data
      return await ctx.db.get(existingUser._id);
    }

    // DUPLICATE EMAIL FIX: Check if email already exists before creating new user
    if (identity.email) {
      const existingEmailUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();
      
      if (existingEmailUser) {
        throw new Error("An account with this email already exists. Please use a different email or sign in with your existing account.");
      }
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      clerkUsername: validatedUsername,
      image: clerkImage ?? undefined,
      tokenIdentifier: identity.subject,
    });

    return await ctx.db.get(userId);
  },
});
