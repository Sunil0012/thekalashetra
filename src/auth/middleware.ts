import { createMiddleware } from "@tanstack/react-start";
import { getServerSession } from "./session";

export type AuthContext = {
  userId: string;
  email: string;
  fullName: string | null;
};

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getServerSession();

    if (!session) {
      throw new Error("Unauthorized: Please sign in.");
    }

    return next({
      context: {
        userId: session.userId,
        email: session.email,
        fullName: session.fullName,
      } satisfies AuthContext,
    });
  },
);
