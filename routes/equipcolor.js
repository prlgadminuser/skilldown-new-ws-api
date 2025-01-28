
const { userCollection } = require('./..//idbconfig');

async function equipColor(username, type, color) {
    const parsedColor = parseInt(color, 10);

    // Validate the color value
    if (isNaN(parsedColor) || parsedColor < -400 || parsedColor > 400) {
        throw new Error("Error equipping color");
    }
  
    // Map the type to the database field
    const validTypes = {
      "A": "hat_color",
      "B": "top_color",
      "I": "banner_color",
      "P": "color",
    };
  
    const dbField = validTypes[type];
  
    if (!dbField) {
        throw new Error("Error equipping color");
    }
  
    try {
      // Update the user document
      const result = await userCollection.updateOne(
        { username },
        { $set: { [dbField]: parsedColor } }
      );
  
      if (result.modifiedCount === 1) {
        return { status: "success" };

      } else {
        throw new Error("Error equipping color");
    }
    } catch (error) {
        throw new Error("Error equipping color");
    }
  }

module.exports = {
    equipColor,
};
