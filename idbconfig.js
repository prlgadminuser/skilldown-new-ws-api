
const password = process.env.DB_KEY || "8RLj5Vr3F6DRBAYc"
const encodedPassword = encodeURIComponent(password);
const { MongoClient, ServerApiVersion } = require("mongodb");

const tokenkey = "d8ce40604d359eeb9f2bff31beca4b4b"


const nicknameRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\| {2,}|:))(?!^\s)(?!.*\s$)(?!.*\s{2,}).{4,16}$/u;
const usernameRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\|\s|:)).{4,16}$/u;
const passwordRegex = /^(?!.*(&[a-zA-Z0-9]+;|<|>|\/|\\|\s)).{4,20}$/u;
const badWords = ["undefined", "null", "liquem", "nigga", "nigger", "niga", "fuck", "ass", "bitch", "hure", "schlampe", "hitler", "whore"]; 

const lgconnecturi = `mongodb+srv://Liquem:${encodedPassword}@cluster0.ed4zami.mongodb.net/?retryWrites=true&w=majority`;

const uri = lgconnecturi

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
      socketTimeoutMS: 30000,
   //   maxConnecting: 2,
     // maxIdleTimeMS: 300000,
     // maxPoolSize: 100,
      //minPoolSize: 0,
    },
  });

async function startMongoDB() {
    try {
        await client.connect();
        console.log("connectedtodatabase")

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
   badWords
}
