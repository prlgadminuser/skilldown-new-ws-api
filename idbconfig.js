
const password = process.env.DB_KEY || "8RLj5Vr3F6DRBAYc"
const encodedPassword = encodeURIComponent(password);
const { MongoClient, ServerApiVersion } = require("mongodb");

const tokenkey = "d8ce40604d359eeb9f2bff31beca4b4b"
const webhookURL = "https://discord.com/api/webhooks/1320922981161107528/KQ_m66iOVDJeXCfSgXX1El9qcsTNC2EKj5d1HZZXiD5pLfPofF5Rb0-QV3MoWgDIaK8_"
const lgconnecturi = `mongodb+srv://Liquem:${encodedPassword}@cluster0.ed4zami.mongodb.net/?retryWrites=true&w=majority`;


const nicknameRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\|\s|:|\$)).{4,16}$/;
const usernameRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\|\s|:|\$)).{4,16}$/;
const passwordRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\|\s|\$)).{4,20}$/;
const badWords = ["undefined", "null", "liquem", "nigga", "nigger", "niga", "fuck", "ass", "bitch", "hure", "schlampe", "hitler", "whore"]; 

const uri = lgconnecturi

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

async function startMongoDB() {
    try {
        await client.connect();
       console.log("Connected to MongoDB")

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

const db = client.db("Cluster0");
const userCollection = db.collection("users");
const battlePassCollection = db.collection("battlepass_users");
const loginRewardsCollection = db.collection("onetime_rewards");
const shopcollection = db.collection("serverconfig");

module.exports = {
   uri,
   tokenkey,
   startMongoDB,
   userCollection,
   db,
   battlePassCollection,
   loginRewardsCollection,
   shopcollection,
   nicknameRegex,
   usernameRegex,
   passwordRegex,
   badWords,
   webhookURL,
}
