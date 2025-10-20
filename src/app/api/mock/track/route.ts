// app/api/track/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "redis";

// 初始化Redis客户端
let redis: ReturnType<typeof createClient>;
try {
  redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  await redis.connect();
} catch (error) {
  console.error("Redis连接失败:", error);
  throw new Error("Redis连接初始化失败");
}

/**
 * 生成唯一trackId
 * 时间戳+随机数组合确保唯一性
 */
const generateTrackId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

/**
 * 查询track记录
 * GET /api/track?trackId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("trackId");

    if (trackId) {
      const key = `track:${trackId}`;
      const trackData = await redis.lRange(key, 0, -1);

      // 反序列化数据
      const parsedData = trackData.map((item) => JSON.parse(item));

      return NextResponse.json({
        trackId,
        data: parsedData,
        length: parsedData.length,
      });
    } else {
      // 扫描所有track键
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

      const trackIds = trackKeys.map((key) => key.replace("track:", ""));
      return NextResponse.json({
        total: trackIds.length,
        trackIds,
      });
    }
  } catch (error) {
    console.error("查询失败:", error);
    return NextResponse.json({ error: "查询track记录失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, data } = body;

    // 验证数据有效性
    if (data === undefined || data === null) {
      return NextResponse.json(
        { error: "请提供要添加的track数据" },
        { status: 400 }
      );
    }

    // 统一处理为数组格式
    const dataArray = Array.isArray(data) ? data : [data];

    // 过滤空数据
    const validData = dataArray.filter(
      (item) => item !== undefined && item !== null
    );
    if (validData.length === 0) {
      return NextResponse.json(
        { error: "提供的数据为空或无效" },
        { status: 400 }
      );
    }

    // 确定目标trackId
    const targetTrackId = trackId || generateTrackId();
    const key = `track:${targetTrackId}`;

    // 序列化所有数据
    const serializedData = validData.map((item) => JSON.stringify(item));

    // 修复：批量添加到Redis列表（兼容不同版本客户端的正确写法）
    // 方式1：使用扩展运算符传递多个参数（适用于大多数版本）
    await redis.rPush(key, serializedData);

    // 方式2：如果方式1报错，可改用数组作为第二个参数（部分客户端支持）
    // await redis.rPush(key, serializedData);

    // 获取当前列表长度
    const length = await redis.lLen(key);

    return NextResponse.json({
      success: true,
      trackId: targetTrackId,
      addedCount: validData.length,
      currentLength: length,
      message: trackId
        ? `已向现有track添加${validData.length}条数据`
        : `已创建新track并添加${validData.length}条数据`,
    });
  } catch (error) {
    console.error("添加失败:", error);
    return NextResponse.json({ error: "添加track记录失败" }, { status: 500 });
  }
}
/**
 * 删除track记录
 * DELETE /api/track?trackId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("trackId");
    if (!trackId) {
      return NextResponse.json({ error: "请提供trackId" }, { status: 400 });
    }

    const key = `track:${trackId}`;
    const deletedCount = await redis.del(key);

    return NextResponse.json({
      success: deletedCount > 0,
      message: deletedCount > 0 ? "track记录已删除" : "track记录不存在",
    });
  } catch (error) {
    console.error("删除失败:", error);
    return NextResponse.json({ error: "删除track记录失败" }, { status: 500 });
  }
}
