
const { userCollection, badWords, usernameRegex, passwordRegex, tokenkey } = require('./..//idbconfig');
const { jwt, bcrypt } = require('./..//index');
const { webhook } = require('./..//discordwebhook');

async function CreateAccount(username, password) {
    try {
        let finalCountryCode = "Unknown"; 

        if (!username || !password) {
            return { status: "Username and password are required" };
        }

        if (username === password) {
            return { status: "Name and password cannot be the same" };
        }

        if (!usernameRegex.test(username)) {
            return { status: "Username not allowed" };
        }

        const containsBadWords = badWords.some(badWord => username.toLowerCase().includes(badWord));

        if (containsBadWords) {
            return { status: "Name not allowed. Try another one" };
        }


        if (!passwordRegex.test(password)) {
            return { status: "Invalid password. Ensure there are no special characters" };
        }

        const existingUser = await userCollection.findOne(
            { username: { $regex: new RegExp(`^${username}$`, "i") } },
            { projection: { _id: 0, username: 1 } },
        );

        if (existingUser) {
            return { status: "Name already taken. Choose another one." };
        }

            const hashedPassword = await bcrypt.hash(password, 1);
            const token = jwt.sign({ username }, tokenkey);
            const currentTimestamp = new Date();

            try {

                await userCollection.insertOne({
                    username,
                    nickname: username,
                    password: hashedPassword,
                    coins: 0,
                    created_at: currentTimestamp,
                    //country_code: finalCountryCode,
                    token,
                    last_collected: 0,
                    items: [],

                });


                const joinedMessage = `${username} has joined Skilldown from ${finalCountryCode}`;
                webhook.send(joinedMessage);

                return { token: token };
            } catch (error) {
                return { status: "Unexpected Error"};
            }
    } catch (error) {
        return { status: "Unexpected Error"};
    }
};

module.exports = {
    CreateAccount
};
