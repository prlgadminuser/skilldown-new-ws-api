const { userCollection } = require('./../idbconfig');
const { rarityConfig } = require('./../boxrarityconfig');

async function buyRarityBox(username) {
    try {
        // Fetch user details
        const user = await getUserDetails(username);

        // Validate user and box count
        if (!user) {
            throw new Error("User not found");
        }
        if (user.boxes < 1) {
            throw new Error("No boxes left");
        }

        // Determine rarity and rewards
        const rarityType = rollForRarity();
        const rarity = determineRarity(rarityType);
        const rewards = generateRewards(rarity, user.items);

        // Decrement box count by 1 (user buys a rarity box)
        const updatedBoxes = user.boxes - 1;

        // Update user fields in a single database operation
        await updateUserFields(username, {
            boxes: updatedBoxes, // Decrement boxes by 1 (no type change)
            items: rewards.items, // Add new items to the set without replacing existing ones
            coins: rewards.coins // Increment coins safely
        });

        // Return rewards
        return rewards;
    } catch (error) { // Logging error for debugging
        throw new Error("An error occurred during the transaction");
    }
}

// Function to determine the rarity based on a random number
function determineRarity(rarityType) {
    for (const [rarity, config] of Object.entries(rarityConfig)) {
        if (rarityType < config.threshold) {
            return rarity;
        }
    }
    return "normal"; // Fallback to normal rarity
}

// Function to generate rewards based on rarity
function generateRewards(rarity, ownedItems) {
    const config = rarityConfig[rarity];
    const rewards = {
        coins: [],
        items: [],
        rarity,
        message: config.message,
    };

    // If rarity is normal, only coins are rewarded
    if (rarity === "normal") {
        for (let i = 0; i < 2; i++) {
            rewards.coins.push(getRandomInRange(config.coinsRange));
        }
        return rewards; // No need to calculate items for normal rarity
    }

    // If rarity is not normal, handle item logic
    const unownedCustomItems = config.customItems.filter(item => !ownedItems.includes(item.id));

    if (rarity !== "normal") {
        // Check if the user owns at least 2 items from the custom items pool
        if (unownedCustomItems.length >= 2) {
            // Reward the user with the missing custom items
            rewards.items = getRandomItems(unownedCustomItems, config.itemCount).map(item => item.id);
        } else {
            // If the user owns 2 or more custom items, fallback to coins
            for (let i = 0; i < 2; i++) {
                rewards.coins.push(getRandomInRange(config.coinsRange));
            }
        }
    }

    return rewards;
}

// Function to get a random selection of items
function getRandomItems(items, count) {
    const randomItems = [];
    while (randomItems.length < count && items.length > 0) {
        const randomIndex = Math.floor(Math.random() * items.length);
        randomItems.push(items[randomIndex]);
        items.splice(randomIndex, 1); // Remove selected item
    }
    return randomItems;
}

// Function to get a random number within a range (min, max)
function getRandomInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to roll for rarity (random value between 0 and 1)
function rollForRarity() {
    return Math.random();
}

// Function to update all user fields in a single database operation
async function updateUserFields(username, { boxes, items, coins }) {
    const updateData = {};

    // Ensure 'boxes' is a number and set it explicitly (avoid replacing type)
    if (typeof boxes !== 'undefined') {
        if (typeof boxes !== 'number') {
            throw new Error("The 'boxes' field must be a number.");
        }
        updateData.$set = updateData.$set || {}; // Ensure $set exists
        updateData.$set.boxes = boxes; // Set boxes to the new value (not incrementing here)
    }

    // Ensure 'items' is an array and add it to the set if it's passed
    if (Array.isArray(items) && items.length > 0) {
        if (!items.every(item => typeof item === 'string')) {
            throw new Error("Each item in 'items' must be a string.");
        }
        updateData.$addToSet = updateData.$addToSet || {}; // Ensure $addToSet exists
        updateData.$addToSet.items = { $each: items }; // Add new items to the existing set
    }

    // Ensure 'coins' is an array of numbers and increment the coin count safely
    if (Array.isArray(coins) && coins.length > 0) {
        if (!coins.every(coin => typeof coin === 'number')) {
            throw new Error("Each coin in 'coins' must be a number.");
        }
        const coinSum = coins.reduce((sum, coin) => sum + coin, 0);
        updateData.$inc = updateData.$inc || {}; // Ensure $inc exists
        updateData.$inc.coins = coinSum; // Increment the coin count by the total sum of coins
    }

    // Ensure we're updating the database with a valid query
    if (Object.keys(updateData).length > 0) {
        await userCollection.updateOne(
            { username },
            updateData
        );
    }
}

// Function to get user details from the database
async function getUserDetails(username) {
    return await userCollection.findOne(
        { username },
        { projection: { username: 1, boxes: 1, items: 1, coins: 1 } }
    );
}

module.exports = {
    buyRarityBox
};
