
const { userCollection } = require('./..//idbconfig');

async function getUserProfile(usernamed) {
  try {
    // Fetch user data from the database
    const userRow = await userCollection.findOne(
      { username: usernamed },
      {
        projection: {
          username: 1,
          nickname: 1,
          equipped_item: 1,
          equipped_item2: 1,
          equipped_banner: 1,
          equipped_pose: 1,
          equipped_color: 1,
          all_coins_earned: 1,
          equipped_hat_color: 1,
          equipped_body_color: 1,
          equipped_banner_color: 1,
          created_at: 1,
          kills: 1,
          damage: 1,
          wins: 1,
          sp: 1
          // country_code: 1, // Uncomment if country_code is needed
        },
      }
    );

    // Handle case where the user is not found
    if (!userRow) {
      throw new Error("User not found");
    }

    // Calculate time since user joined
    const joinedTimestamp = userRow.created_at.getTime();
    const currentTime = new Date().getTime();
    const timeSinceJoined = currentTime - joinedTimestamp;

    const daysSinceJoined = Math.floor(timeSinceJoined / (1000 * 60 * 60 * 24));
    const monthsSinceJoined = Math.floor(daysSinceJoined / 30);
    const yearsSinceJoined = Math.floor(monthsSinceJoined / 12);

    let displayString;

    if (yearsSinceJoined > 0) {
      displayString = `${yearsSinceJoined} year${yearsSinceJoined > 1 ? "s" : ""}`;
    } else if (monthsSinceJoined > 0) {
      displayString = `${monthsSinceJoined} month${monthsSinceJoined > 1 ? "s" : ""}`;
    } else {
      displayString = `${daysSinceJoined} day${daysSinceJoined > 1 ? "s" : ""}`;
    }

    // Return the user profile data
    return {
      username: userRow.username || "User",
      nickname: userRow.nickname || "User",
      equipped_item: userRow.equipped_item || 0,
      equipped_item2: userRow.equipped_item2 || 0,
      equipped_banner: userRow.equipped_banner || 0,
      equipped_pose: userRow.equipped_pose || 0,
      equipped_color: userRow.equipped_color || 0,
      all_coins_earned: userRow.all_coins_earned || 0,
      equipped_hat_color: userRow.equipped_hat_color || 0,
      equipped_body_color: userRow.equipped_body_color || 0,
      equipped_banner_color: userRow.equipped_banner_color || 0,
      days_since_joined: displayString,
      sp: userRow.sp || 0,
      kills: userRow.kills || 0,
      damage: userRow.damage || 0,
      wins: userRow.wins || 0,
      // country_code: userRow.country_code, // Uncomment if country_code is needed
    };
  } catch (error) {
    throw new Error("An error occurred while fetching user profile");
  }
}

module.exports = {
  getUserProfile
}