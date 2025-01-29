
const { userCollection, tokenkey } = require('./..//idbconfig');
const { jwt, bcrypt } = require('./..//index');

async function Login(username, password) {
  
    try {
      const user = await userCollection.findOne(
        { username },
        { projection: { username: 1, password: 1 } },
      );
  
      if (!user) {
        return { status: "Invalid username or password" };
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return { status: "Invalid username or password" };
      }
  
      // Generate a token
      const token = jwt.sign({ username: user.username }, tokenkey);
  
      // Save the token to the user document
      await userCollection.updateOne({ username }, { $set: { token } });
  
      return { token: token };
    } catch (error) {
        return { status: "unexpected error" };
    }
  };
   
module.exports = {
    Login
};
