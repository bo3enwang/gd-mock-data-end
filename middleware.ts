// middleware.js
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // 获取请求来源
  const origin = req.headers.get("origin") || "*";

  // 定义允许的来源（生产环境应指定具体域名）
  const allowedOrigins = ["*"];

  // 检查来源是否允许
  const isAllowed =
    allowedOrigins.includes(origin) || allowedOrigins.includes("*");

  // 创建响应对象
  const response = NextResponse.next();

  // 设置 CORS 头
  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24小时缓存预检请求
  }

  // 处理 OPTIONS 请求
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      headers: {
        ...response.headers,
      },
    });
  }

  return response;
}

// 指定中间件适用的路径（这里对所有 API 路由生效）
export const config = {
  matcher: "/api/:path*",
};
