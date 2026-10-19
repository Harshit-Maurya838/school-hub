import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { InternalServerError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";


export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => {
    let dbStatus = "disconected";
    let redisStatus = "disconected";

    try{
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = "connected";
    }catch(err: unknown){
        throw new InternalServerError("Database connection failed", err as Error);
    }

    try{
        const ping = await redis.ping();
        if(ping === "PONG"){
            redisStatus = "connected";
        }
    }catch(err: unknown){
        redisStatus = "degraded";
    }

    return successResponse({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus,
            redis: redisStatus,
        },
    })
})