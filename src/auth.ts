import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { UserRole } from "@prisma/client";
import type { Provider } from "next-auth/providers";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

async function loadTenantUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      passwordHash: true,
    },
  });
}

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const user = await loadTenantUser(email);
      if (!user?.organizationId || !user.passwordHash) return null;

      const valid = await compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role,
      };
    },
  }),
];

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

const nextAuth = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return Boolean(user.organizationId);
      }

      const email = user.email;
      if (!email) return false;

      const dbUser = await loadTenantUser(email);
      if (!dbUser?.organizationId) return false;

      user.id = dbUser.id;
      user.organizationId = dbUser.organizationId;
      user.role = dbUser.role;
      user.name = dbUser.name;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.organizationId) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        return token;
      }

      if (token.email && !token.organizationId) {
        const dbUser = await loadTenantUser(token.email);
        if (dbUser?.organizationId) {
          token.id = dbUser.id;
          token.organizationId = dbUser.organizationId;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token.organizationId && token.id && token.role) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as UserRole;
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;
export const auth = nextAuth.auth;

/** Server-side session for API routes and RSC. */
export async function getServerSession() {
  return auth();
}
