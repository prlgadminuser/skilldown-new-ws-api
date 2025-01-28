


const rarityConfig = {
    normal: {
        threshold: 0.8,
        coinsRange: [15, 30], // Coins for normal rarity
        itemCount: 0, // No items for normal
        customItems: null, // No custom items for normal
        message: "success",
    },
    rare: {
        threshold: 0.995,
        coinsRange: [15, 25], // No coins for rare
        itemCount: 2, // Number of unowned items to award (from customItems)
        customItems: [
    { id: "A001" }, { id: "A002" }, { id: "A003" }, { id: "A004" },
    { id: "A005" }, { id: "A006" }, { id: "A007" }, { id: "A008" },
    { id: "A009" }, { id: "A010" }, { id: "A011" }, { id: "A012" },
    { id: "A013" }, { id: "A014" }, { id: "A015" }, { id: "A016" },
    { id: "A017" }, { id: "A018" }, { id: "A019" }, { id: "A020" },
    { id: "A021" }, { id: "A022" }, { id: "A023" }, { id: "A025" },
    { id: "A026" }, { id: "A030" }, { id: "A031" }, { id: "A034" },
    { id: "B001" }, { id: "B002" }, { id: "B003" }, { id: "B004" },
    { id: "B005" }, { id: "B006" }, { id: "B007" }, { id: "B008" },
    { id: "B009" }, { id: "B010" }, { id: "B011" }, { id: "B012" },
    { id: "B013" }, { id: "B014" }, { id: "B015" }, { id: "B016" },
    { id: "B017" }, { id: "B018" }, { id: "B019" }, { id: "B020" },
    { id: "B024" }, { id: "B025" }, { id: "I001" }, { id: "I002" },
    { id: "I003" }, { id: "I004" }, { id: "I005" }, { id: "I007" },
    { id: "I008" }, { id: "I009" }, { id: "I010" }, { id: "P001" },
    { id: "P002" }, { id: "P003" }, { id: "P004" }, { id: "P005" },
    { id: "P006" }, { id: "P007" }, { id: "P008" }
    ],
       message: "success",
    },
    legendary: {
        threshold: 1.0,
        coinsRange: [130, 200], // Coins for legendary and higher rarities
        itemCount: 2, // Number of custom items to award
        customItems: [{ id: "A029" }, { id: "I011" }], // Predefined items for legendary
        message: "success",
    },
};





function calculateRarityPercentages() {
    const rarityPercentages = {};
    let previousThreshold = 0;

    for (const [rarity, config] of Object.entries(rarityConfig)) {
        const percentage = ((config.threshold - previousThreshold) * 100).toFixed(2) + '%';
        rarityPercentages[rarity] = parseFloat(percentage);
        previousThreshold = config.threshold;
    }

   // console.log("Rarity Percentages:", rarityPercentages);
    return rarityPercentages;
}

// Call calculateRarityPercentages to log the percentages at runtime
const rarityPercentages = calculateRarityPercentages(); 

module.exports = {
    rarityPercentages,
    rarityConfig,
}