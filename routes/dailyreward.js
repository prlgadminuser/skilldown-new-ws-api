
const { userCollection, shopcollection } = require('./..//idbconfig');

function canCollectCoins(lastCollected) {
    const hoursPassed = (Date.now() - lastCollected) / (1000 * 60 * 60);
    return hoursPassed >= 24;
  }

  function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  


async function getdailyreward(username) {
      
        try {
            // Check if the user exists in the database
            const user = await userCollection.findOne(
                { username },
                { projection: { _id: 0, username: 1, last_collected: 1 } }
            );
    
            if (!user) {
                throw new Error("Error");
            }
    
            // Check if enough time has passed since the last coin collection
            const lastCollected = user.last_collected;
    
            if (!canCollectCoins(lastCollected)) {
                throw new Error("Error");
            }
    
            // Fetch daily reward configuration
            const coinsdata = await shopcollection.findOne(
                { _id: "dailyrewardconfig" },
                { projection: { coinsmin: 1, coinsmax: 1 } }
            );
    
            // Generate a random number of coins to add
            const coinsToAdd = generateRandomNumber(coinsdata.coinsmin, coinsdata.coinsmax);
    
            // Update user data in the database
            await userCollection.updateOne(
                { username },
                {
                    $inc: { coins: coinsToAdd },
                    $set: { last_collected: Date.now() },
                }
            );
    
            // Send the response
            return {
                coins: coinsToAdd,
                time: Date.now(),
            };
    
        } catch (error) {
            throw new Error("Error");
        }
    }
    



module.exports = {
   getdailyreward,
 };