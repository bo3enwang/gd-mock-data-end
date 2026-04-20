import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "http://127.0.0.1:6789",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // 匹配 *.getdynamic.io
  try {
    const url = new URL(origin);
    return url.hostname === "getdynamic.io" || url.hostname.endsWith(".getdynamic.io");
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (allowed && origin) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
    corsHeaders["Vary"] = "Origin";
  }

  // 处理OPTIONS预检请求
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 处理其他请求
  const response = NextResponse.next();

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// 对所有API路由生效
export const config = {
  matcher: "/api/:path*",
};
