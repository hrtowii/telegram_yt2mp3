import { Telegraf, Scenes, session, Markup } from "telegraf";
import { message } from "telegraf/filters";
import ytdl from '@distube/ytdl-core'; // https://github.com/fent/node-ytdl-core/issues/1230
import fs from 'fs';
import path from 'path';
import { sleep } from "bun";
const youtubeDomains = ["youtube.com", "youtu.be"]
const audioDir = path.join(__dirname, 'audio');
if (process.env.TOKEN === "") {
    console.log("invalid TOKEN in .env");
    process.exit();
}
const bot = new Telegraf<Scenes.SceneContext>(process.env.TOKEN || "");
bot.telegram.setMyCommands([
    {
        command: "start",
        description: "Introduction",
    },
]);

bot.start((ctx) =>
    ctx.reply(
      "Send me either a youtube video link or a playlist, and I will send you either 1 or multiple mp3s back.",
    ),
);

if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

bot.on(message("text"), async (ctx) => {
    if (youtubeDomains.some(message => ctx.message.text.includes(message))) {
        const videoID = await ytdl.getURLVideoID(ctx.message.text)
        let info = await ytdl.getInfo(videoID);
        const title = info.videoDetails.title
        const filePath = path.join(audioDir, `${videoID}.mp3`)
        if (!fs.existsSync(filePath)) {
            let format = ytdl.chooseFormat(info.formats, { 
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            ctx.reply("Downloading...")
            // await new Promise<void>((resolve) => {
            //     .on('pipe', () => {
            //         resolve()
            //     });
            // })
            ytdl(ctx.message.text, { format: format }).pipe(fs.createWriteStream(filePath))
            await sleep(1500);
            ctx.replyWithAudio({ source: fs.readFileSync(filePath), filename: title.toString() });           
        } else {
            const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                    ctx.reply("Error: File exists but is empty");
                    return;
                }
            const buffer = fs.readFileSync(filePath)
            ctx.replyWithAudio({ source: buffer, filename: title.toString() })
        }
    } else {
        ctx.reply("Send me an actual youtube link")
    }
})


bot.launch();