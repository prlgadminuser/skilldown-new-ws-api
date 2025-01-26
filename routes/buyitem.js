
const { userCollection, shopcollection } = require('./../idbconfig');

async function buyItem(username, offerKey) {
    try {
      // Fetch shop data and the selected offer using offerKey
      const shopData = await shopcollection.findOne(
        { _id: "dailyItems" },
        { projection: { [`items.${offerKey}`]: 1 } }
      );
  
      // If the offer is not found, throw an error
      const selectedOffer = shopData?.items?.[offerKey];
      if (!selectedOffer) {
        throw new Error("Offer is not valid.");
      }
  
      // Get the currency field from the offer
      const { currency = "coins" } = selectedOffer; // Default to "coins" if currency is not specified
      const { quantity = 1 } = selectedOffer; // Get the quantity if it's specified
  
      // Normalize itemIds to an array (handle single or bundled items)
      const itemIds = Array.isArray(selectedOffer.itemId)
        ? selectedOffer.itemId
        : [selectedOffer.itemId];
  
      // Check if the user already owns any item in the offer
      const user = await userCollection.findOne(
        {
          username,
          items: { $exists: true, $in: itemIds },
        }
      );
  
      if (user) {
        throw new Error("You already own an item from this offer.");
      }
  
      // Fetch the user's balance for the specified currency
      const userRow = await userCollection.findOne(
        { username },
        { projection: { [currency]: 1 } } // Dynamically fetch the user's balance in the specified currency
      );
  
      if (!userRow) {
        throw new Error("User not found.");
      }
  
      // Check if the user has enough balance to buy the offer
      const price = parseInt(selectedOffer.price, 10); // Ensure price is a number
      if ((userRow[currency] || 0) < price) {
        throw new Error(`Not enough ${currency} to buy the offer.`);
      }
  
      // Check if it's a normal item, box purchase, or season coin pack
      const isItemPurchase = !selectedOffer.itemId.includes("box") && !selectedOffer.itemId.includes("seasoncoins");
      const isBoxPurchase = selectedOffer.itemId.includes("box");
      const isSeasonCoinPack = selectedOffer.itemId.includes("seasoncoins");
  
      let updateFields = {};
  
      // Handle normal item purchase
      if (isItemPurchase) {
        updateFields = {
          $addToSet: { items: { $each: itemIds } }, // Add the normal item(s)
        };
      }
  
      // Handle box purchases
      if (isBoxPurchase) {
        updateFields = {
          $inc: { boxes: quantity }, // Increment the 'boxes' field by the quantity
        };
      }
  
      // Handle season coin pack purchases
      if (isSeasonCoinPack) {
        updateFields = {
          $inc: { seasonCoins: quantity }, // Increment the 'seasonCoins' field by the quantity
        };
      }
  
      // Only deduct currency if the price is greater than zero
      if (price > 0) {
        updateFields = {
          ...updateFields,
          $inc: { [currency]: -price }, // Deduct the correct currency
        };
      }
  
      // Deduct currency and update the user's inventory or purchase quantity in a single update operation
      await userCollection.updateOne({ username }, updateFields);
  
      return {
        message: `You have purchased ${selectedOffer.offertext} using ${currency}.`,
      };
    } catch (error) {
      console.error("Error during purchase:", error);
      throw new Error(error.message || "An error occurred while processing your request.");
    }
  }
  

module.exports = {
    buyItem
};
