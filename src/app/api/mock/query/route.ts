import { NextResponse, NextRequest } from "next/server";
import { createClient } from "redis";
const redis = await createClient({ url: process.env.REDIS_URL }).connect();

// 处理所有请求方法
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "请提供 key 参数" }, { status: 400 });
  }

  try {
    const value = await redis.get(key);
    return NextResponse.json({
      key,
      value,
      exists: value !== null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "获取数据失败", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, expiresIn } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "请提供 key 和 value 参数" },
        { status: 400 }
      );
    }

    // 保存数据，可以设置过期时间
    if (expiresIn) {
      await redis.set(key, value, { expiration: expiresIn });
    } else {
      await redis.set(key, value);
    }

    return NextResponse.json({
      success: true,
      key,
      message: "数据已保存",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "保存数据失败", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "请提供 key 参数" }, { status: 400 });
  }

  try {
    await redis.del(key);
    return NextResponse.json({
      success: true,
      key,
      message: "数据已删除",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "删除数据失败", details: error.message },
      { status: 500 }
    );
  }
}

// 允许的请求方法
export const config = {
  matcher: "/api/kv",
};
