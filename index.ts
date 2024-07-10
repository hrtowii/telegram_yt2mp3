import { Telegraf, Scenes, session, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { WizardScene, BaseScene, Stage } from "telegraf/scenes";
import ytdl from '@distube/ytdl-core'; // https://github.com/fent/node-ytdl-core/issues/1230
import fs from 'fs';
import path from 'path';
import util from 'util';
const youtubeDomains = ["youtube.com", "youtu.be"]
const audioDir = path.join(__dirname, 'audio');
const fsAccess = util.promisify(fs.access);
const fsMkdir = util.promisify(fs.mkdir);
const fsReadFile = util.promisify(fs.readFile);
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

(async () => {
    try {
        await fsAccess(audioDir);
    } catch {
        await fsMkdir(audioDir, { recursive: true });
    }
})();

bot.on(message("text"), async (ctx) => {
    if (youtubeDomains.some(message => ctx.message.text.includes(message))) {
        const videoID = await ytdl.getURLVideoID(ctx.message.text)
        let info = await ytdl.getInfo(videoID);
        const filePath = path.join(audioDir, `${videoID}.mp3`)
        let fileExists = true;
        try {
            await fsAccess(filePath)
        } catch {
            fileExists = false;
        }
        if (!fileExists) {
            let format = ytdl.chooseFormat(info.formats, { 
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            await ctx.reply("Downloading...")
            await new Promise<void>((resolve, reject) => {
                ytdl(ctx.message.text, { format: format })
                    .pipe(fs.createWriteStream(filePath))
                    .on('finish', () => resolve())
                    .on('error', reject);
            });
            console.log(`Downloaded audio to ${filePath}`)
        }
        const audioBuffer = await fsReadFile(filePath);
        await ctx.replyWithAudio({ source: audioBuffer, filename: `${videoID}.mp3` })
    } else {
        await ctx.reply("Send me an actual youtube link")
    }
})


bot.launch();