
const { webhookURL } = require('./idbconfig');
const { Discord } = require('./index');

const webhook = new Discord.WebhookClient({
    url: webhookURL,
  });

  module.exports = {
  webhook
  }