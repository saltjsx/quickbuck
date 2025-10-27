import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed - always update image to ensure it's current
      const updatedFields: Parameters<typeof ctx.db.patch>[1] = {
        name: identity.name,
        email: identity.email,
        clerkUsername: (identity.username as string) ?? undefined,
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

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      clerkUsername: (identity.username as string) ?? undefined,
      image: clerkImage ?? undefined,
      tokenIdentifier: identity.subject,
    });

    return await ctx.db.get(userId);
  },
});
