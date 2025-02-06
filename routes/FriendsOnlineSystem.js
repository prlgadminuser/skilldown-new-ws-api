
const { userCollection } = require("../idbconfig");
const { connectedPlayers } = require('./..//index');
const { friendUpdatesTime } = require("../limitconfig");


async function GetFriendsDataLocal(username) {
  try {
    const maxAgeOfPing = friendUpdatesTime + 5000; // 20 seconds in milliseconds
    const recentPingThreshold = Date.now() - maxAgeOfPing;

    const result = await userCollection.aggregate([
      {
        $match: { username } // Find the user
      },
      {
        $lookup: {
          from: "users",
          localField: "friends",
          foreignField: "username",
          pipeline: [
            {
              $match: { lastping: { $gt: recentPingThreshold } } // Only fetch online friends
            },
            {
              $project: { _id: 0, nickname: 1, username: 1, sp: 1 } // Return only necessary fields
            }
          ],
          as: "friendsOnline"
        }
      },
      {
        $project: { _id: 0, friendsOnline: 1 }
      }
    ]).toArray();

    if (!result || result.length === 0) {
      return { success: false, message: "No data found for the user" };
    }

    const onlineFriends = result[0].friendsOnline || [];

    return {
          friendsOnline: onlineFriends.map(friend => ({
          id: friend.username,
          nick: friend.nickname,
          sp: friend.sp || 0,
        }))
      
    };
  } catch (error) {
   // console.error("Error fetching friends data:", error);
    return { success: false, message: "none" };
  }
}







async function UpdateSelfPingTime(username) {

  await userCollection.updateOne(
    { username },
    {
        $set: { lastping: Date.now() }
    }
);

}


module.exports = {
  GetFriendsDataLocal,
  UpdateSelfPingTime,
}