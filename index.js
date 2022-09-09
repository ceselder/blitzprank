const isSummonerLookupMessageRegex = new RegExp('.+joined the lobby.*');
const summonerSplitRegex = new RegExp(' joined the lobby[.]?\n?');
const uggRegion = 'euw1'

const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const crypto = require("crypto");
const fs = require('fs');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});



async function takeUggScreenShot(url)
{
    const filename = `${crypto.randomBytes(20).toString('hex')}.png`;
    const padding = 20;

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox']
    })
    let page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720})
    await page.goto(url);
    await page.click(`button[class=' css-47sehv']`); //cookies accept
    await page.mouse.wheel({deltaY: -150});
    await page.waitForSelector('.multisearch-results');          // wait for the selector to load
    
    const rect = await page.evaluate(selector => {
    const element = document.querySelector('.multisearch-results');
    const {x, y, width, height} = element.getBoundingClientRect();
    return {left: x, top: y, width, height, id: element.id};
    });
    
    await page.screenshot({
    path: filename,
    clip: {
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
    }});

    await browser.close();
    return filename
};

function isSummonerLookupMessage(messageContent)
{
    return messageContent.match(isSummonerLookupMessageRegex);
}

client.on('messageCreate', async message => {
  if (isSummonerLookupMessage(message.content))
  {
    let summoners = message.content.split(summonerSplitRegex)
    summoners = summoners.filter((str) => str.length > 0)
    if (summoners.length == 0) { return; }
    summoners = summoners.map(str => encodeURIComponent(str))
    let summonersURLString = summoners.join(',');

    message.channel.sendTyping()

    const URL = `https://u.gg/multisearch?summoners=${summonersURLString}&region=${uggRegion}`
    const filename = await takeUggScreenShot(URL)

    await message.reply({ files: [`./${filename}`] });
    await message.delete()

    fs.rmSync(`./${filename}`);
  }
  
});

client.login(process.env.TOKEN);