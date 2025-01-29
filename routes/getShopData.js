
const { shopcollection } = require('./..//idbconfig');

async function getshopdata() {

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const t0am = currentDate.getTime();

  try {
    // Find the daily items in the shop
    const dailyItems = "dailyItems";
    const itemshop = await shopcollection.findOne({ _id: dailyItems });

    if (!itemshop) {
      throw new Error("error");
    }

    return ({
      dailyItems: itemshop.items, // Or items directly if you don't need an array
      shoptheme: itemshop.theme,
      server_nexttime: t0am
    });
  } catch (error) {
    // console.error("Error fetching daily items:", error);
    throw new Error("error");
  }
}


module.exports = {
    getshopdata,
 };