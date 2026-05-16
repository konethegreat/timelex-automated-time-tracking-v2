(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push(["chunks/[root-of-the-server]__04o3v~f._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/auth.config.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authConfig",
    ()=>authConfig
]);
const authConfig = {
    pages: {
        signIn: "/login"
    },
    session: {
        strategy: "jwt"
    },
    trustHost: true,
    callbacks: {
        jwt ({ token, user }) {
            if (user?.organizationId) {
                token.id = user.id;
                token.organizationId = user.organizationId;
                token.role = user.role;
            }
            return token;
        },
        session ({ session, token }) {
            if (token.organizationId && token.id && token.role) {
                session.user.id = token.id;
                session.user.organizationId = token.organizationId;
                session.user.role = token.role;
            }
            return session;
        },
        authorized ({ auth, request }) {
            const { pathname } = request.nextUrl;
            const isAuthRoute = pathname.startsWith("/api/auth");
            const isLoginPage = pathname === "/login";
            const isApi = pathname.startsWith("/api");
            const isProtectedApp = pathname.startsWith("/dashboard") || pathname.startsWith("/drafts") || pathname.startsWith("/ledger") || pathname.startsWith("/billing");
            if (isAuthRoute || isLoginPage) {
                return true;
            }
            const organizationId = auth?.user?.organizationId;
            const isTenantSession = Boolean(auth?.user?.id) && Boolean(organizationId);
            if (isApi || isProtectedApp) {
                return isTenantSession;
            }
            return true;
        }
    },
    providers: []
};
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2e$config$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/auth.config.ts [middleware-edge] (ecmascript)");
;
;
;
const { auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$auth$2e$config$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["authConfig"]);
const __TURBOPACK__default__export__ = auth((req)=>{
    const { pathname } = req.nextUrl;
    const isApi = pathname.startsWith("/api");
    const isProtectedApp = pathname.startsWith("/dashboard") || pathname.startsWith("/drafts") || pathname.startsWith("/ledger") || pathname.startsWith("/billing");
    const organizationId = req.auth?.user?.organizationId;
    const hasTenantSession = Boolean(req.auth?.user?.id) && Boolean(organizationId);
    if (!hasTenantSession && isApi && !pathname.startsWith("/api/auth")) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized — valid tenant session required"
        }, {
            status: 401
        });
    }
    if (!hasTenantSession && isProtectedApp) {
        const login = new URL("/login", req.nextUrl.origin);
        login.searchParams.set("callbackUrl", pathname);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(login);
    }
    if (hasTenantSession && pathname === "/login") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
});
const config = {
    matcher: [
        "/api/:path*",
        "/dashboard/:path*",
        "/drafts/:path*",
        "/ledger/:path*",
        "/billing/:path*",
        "/login"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__04o3v~f._.js.map