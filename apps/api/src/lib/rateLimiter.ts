import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis.js";

export const loginRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  useRedisPackage: true,
  keyPrefix: "login_fail",
  points: 5,
  duration: 60 * 15,
  blockDuration: 60 * 15,
});