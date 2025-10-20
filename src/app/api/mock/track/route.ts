// app/api/track/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "redis";

// 初始化 Redis 客户端
let redis: ReturnType<typeof createClient>;
try {
  redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await redis.connect();
} catch (error) {
  console.error("Redis 连接失败:", error);
  throw new Error("Redis 连接初始化失败");
}

/**
 * 生成唯一的 trackId
 * 使用时间戳 + 随机数组合，确保唯一性
 */
const generateTrackId = (): string => {
  const timestamp = Date.now().toString(36); // 时间戳转36进制
  const random = Math.random().toString(36).substring(2, 8); // 6位随机数
  return `${timestamp}-${random}`;
};

/**
 * 处理 GET 请求 - 查询 track 记录
 * 支持通过 trackId 参数查询特定记录
 */
export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("trackId");

    if (trackId) {
      // 查询单个 track 记录
      const key = `track:${trackId}`;
      const trackData = await redis.lRange(key, 0, -1); // 获取列表所有元素

      if (trackData.length === 0) {
        return NextResponse.json(
          { error: "Track 记录不存在" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        trackId,
        data: trackData,
        length: trackData.length,
      });
    } else {
      // 查询所有 trackId（通过扫描匹配键）
      const trackKeys = [];
      let cursor = "0";
      do {
        const reply = await redis.scan(cursor, {
          MATCH: "track:*",
          COUNT: 100,
        });
        cursor = reply.cursor;
        trackKeys.push(...reply.keys);
      } while (cursor !== "0");

      // 提取 trackId（去掉前缀 "track:"）
      const trackIds = trackKeys.map((key) => key.replace("track:", ""));

      return NextResponse.json({
        total: trackIds.length,
        trackIds,
      });
    }
  } catch (error) {
    console.error("查询 Track 失败:", error);
    return NextResponse.json({ error: "查询 Track 记录失败" }, { status: 500 });
  }
}

/**
 * 处理 POST 请求 - 创建/新增 track 记录
 * 支持创建新 track 或向已有 track 添加数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, data } = body;

    // 验证数据是否存在
    if (data === undefined || data === null) {
      return NextResponse.json(
        { error: "请提供要添加的 track 数据" },
        { status: 400 }
      );
    }

    // 处理 trackId：如果没有提供则自动生成
    const targetTrackId = trackId || generateTrackId();
    const key = `track:${targetTrackId}`;

    // 将数据添加到 Redis 列表（使用 LPUSH 从左侧添加，或 RPUSH 从右侧添加）
    await redis.rPush(key, JSON.stringify(data)); // 序列化数据存储

    // 获取当前列表长度
    const length = await redis.lLen(key);

    return NextResponse.json({
      success: true,
      trackId: targetTrackId,
      currentLength: length,
      message: trackId ? "数据已添加到现有 Track" : "新 Track 已创建并添加数据",
    });
  } catch (error) {
    console.error("创建/新增 Track 失败:", error);
    return NextResponse.json(
      { error: "创建/新增 Track 记录失败" },
      { status: 500 }
    );
  }
}

// 可选：处理 DELETE 请求 - 删除 track 记录
export async function DELETE(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("trackId");
    if (!trackId) {
      return NextResponse.json({ error: "请提供 trackId" }, { status: 400 });
    }

    const key = `track:${trackId}`;
    const deletedCount = await redis.del(key);

    return NextResponse.json({
      success: deletedCount > 0,
      message: deletedCount > 0 ? "Track 记录已删除" : "Track 记录不存在",
    });
  } catch (error) {
    console.error("删除 Track 失败:", error);
    return NextResponse.json({ error: "删除 Track 记录失败" }, { status: 500 });
  }
}
