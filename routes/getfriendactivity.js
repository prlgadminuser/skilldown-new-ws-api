const { userCollection } = require("../idbconfig");
const { connectedPlayers } = require('./..//index');


async function GetFriendsDataLocal(username, userfriends) {
    
    const onlineFriends = userfriends.filter(friend => connectedPlayers.has(friend));


    return onlineFriends

    const friendsData = onlineFriends.map(friend => {
        const player = connectedPlayers.get(friend);  // Assuming connectedPlayers is a Map or similar

        // Return detailed info for each friend (with additional fields like status, gameMode, etc.)
        return {
            username: friend,
            status: player.status || "offline", // Default to "offline" if no status is found
            gameMode: player.gameMode || "none", // Default to "none" if no gameMode is found
            playing: player.playing || "unknown", // Default to "unknown" if no game info is found
            lastSeen: player.lastSeen || "N/A", // Optional lastSeen info, if available
            // You can add more fields here as needed
        };
    });
}

module.exports = {
    GetFriendsDataLocal
}



async function GetFriendRealtimeData(username) {

    userCollection.aggregate([
        {
          $match: { username: username } // Find the current user
        },
        {
          $lookup: {
            from: "users",
            let: { friendsList: "$friends" }, // Store friends list
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$username", "$$friendsList"] }, // Match only necessary friends
                  status: "online" // Fetch only online friends directly
                }
              },
              {
                $project: { _id: 0, username: 1, sp: 1, status: 1 } // Only needed fields
              }
            ],
            as: "onlineFriends"
          }
        },
        {
          $project: { _id: 0, username: 1, onlineFriends: 1 } // 
        }
      ])
}