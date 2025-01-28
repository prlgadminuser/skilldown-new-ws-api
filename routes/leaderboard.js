
const { userCollection } = require('./..//idbconfig');

const updateHighscores = async () => {
    try {
      const highscores = await userCollection
        .aggregate([
          {
            $match: {
              nickname: { $ne: "Liq0uem" } // Exclude player with username "Liquem"
            }
          },
          { 
            $sort: { 
              sp: -1 
            } 
          },
          { 
            $limit: 50 
          },
          { 
            $project: {
              _id: 0,
              n: "$nickname",  // Shortened "nickname" to "n"
              u: "$username",  // Shortened "username" to "u"
              s: { $ifNull: ["$sp", 0] }
            } 
          }
        ])
        .toArray();

       // const processedHighscores = highscores.map(score => 
       //   `${score.nickname}:${score.username}:${score.sp}`
       // );
        

        
     // console.log(processedHighscores)
  
      // Store the updated highscores in a server variable.
     global.highscores = highscores
  
      console.log("Highscores were successfully updated.");
    } catch (error) {
      console.error("Internal Server Error while updating highscores:", error);
    }
  };
  


  async function gethighscores() {

  const highscores = global.highscores

    return highscores;
  }

  async function setupHighscores() {

    updateHighscores();
  // Update the highscores every 5 minutes (300000 milliseconds).
  setInterval(updateHighscores, 300000);
    }

  module.exports = {
    setupHighscores,
    gethighscores,
  }