import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// redis payload
const payload = {
    port: 6379, 
    host: process.env.REDIS_LOCALHOST, 
    username: "default", 
    password: process.env.REDIS_PASSWORD,
    db: 0, 
  }
// initialize redis
const redis = new Redis(payload)

redis.on("connect", ()=>{
    console.log(`Redis client connected`)

    redis.on("disconnect", ()=>{
        console.log(`Redis disconnected`)
    })
})

export default redis;