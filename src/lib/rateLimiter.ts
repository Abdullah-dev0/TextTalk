import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis
const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create a rate limiter: Allow 3 messages per minute per user
export const rateLimiter = new Ratelimit({
	redis,
	limiter: Ratelimit.fixedWindow(3, "5m"), // 3 messages per 5 minutes
});
