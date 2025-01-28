
const { Limiter } = require('./index');

function createRateLimiter() { // connected sending message rate limit
    const rate = 5; 
    return new Limiter({
      tokensPerInterval: rate,
      interval: 1000, // milliseconds
    });
  }

  const ConnectionOptionsRateLimit = {  // public ip rate limit
    points: 1, // Number of points
    duration: 2, // Per second
  };

  module.exports = {
    createRateLimiter,
    ConnectionOptionsRateLimit
  }