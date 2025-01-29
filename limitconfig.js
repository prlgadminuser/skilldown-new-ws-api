
const { Limiter, RateLimiterMemory } = require('./index');

function createRateLimiter() { // connected sending message rate limit
  const rate = 5;
  return new Limiter({
    tokensPerInterval: rate,
    interval: 1000, // milliseconds
  });
}

const ConnectionOptionsRateLimit = { 
  points: 1, // Number of points
  duration: 2, // Per second
};

const apiRateLimiter = new RateLimiterMemory({
    points: 1,  // 10 requests per second
    duration: 1,
});

const AccountRateLimiter = new RateLimiterMemory({
  points: 1,  // 10 requests per second
  duration: 86400,
});


module.exports = {
  createRateLimiter,
  ConnectionOptionsRateLimit,
  apiRateLimiter,
  AccountRateLimiter,
}