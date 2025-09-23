import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // 允许所有来源、方法和头信息
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // 允许所有域名
    "Access-Control-Allow-Methods": "*", // 允许所有HTTP方法
    "Access-Control-Allow-Headers": "*", // 允许所有请求头
    "Access-Control-Max-Age": "86400", // 预检请求缓存24小时
  };

  // 处理OPTIONS预检请求
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 处理其他请求
  const response = NextResponse.next();

  // 为所有响应添加CORS头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// 对所有API路由生效
export const config = {
  matcher: "/api/:path*",
};
