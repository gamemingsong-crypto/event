const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const TOKEN = "MTUxNzIxNjIzMzk1MzQyNzUxNg.GfYzEn.iMAj1ORLG-rgVxVMkb-l4EYPT_h1prkUbq80iY";
const ADMIN_ID = "1510992258319515689";

const DATA_FILE = "./data.json";

let players = [];
let openNumber = true;
let tableMessageId = null;
let tableChannelId = null;

function saveData() {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({
            players,
            openNumber,
            tableMessageId,
            tableChannelId
        }, null, 2)
    );

}

function loadData() {

    if (!fs.existsSync(DATA_FILE)) {

        saveData();
        return;

    }

    try {

        const data = JSON.parse(
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            )
        );

        players = data.players || [];
        openNumber = data.openNumber ?? true;
        tableMessageId =
            data.tableMessageId || null;
        tableChannelId =
            data.tableChannelId || null;

    } catch {

        console.log(
            "โหลดข้อมูลไม่สำเร็จ"
        );

    }
}

loadData();

async function tempMessage(
    channel,
    content
) {

    const msg =
        await channel.send(content);

    setTimeout(() => {

        msg.delete().catch(() => {});

    },   5 * 1000);

}
function createNumberTableEmbed(players) {

    const embed = new EmbedBuilder()
        .setTitle("🐱📊 ตารางเลข 00–99")
        .setColor(0xFFD6E9)
        .setFooter({
            text: "❤️ = เต็ม | 💛 = เหลือ 1 | 🤍 = ว่าง"
        });

    for (let start = 0; start < 100; start += 24) {

        let value = "```\n";

        for (
            let i = start;
            i < start + 24 && i < 100;
            i++
        ) {

            const num = i
                .toString()
                .padStart(2, "0");

            const count = players.filter(
                p => p.number === num
            ).length;

            let status = "🤍";

            if (count === 1)
                status = "💛";

            if (count >= 2)
                status = "❤️";

            value += `${status}${num}  `;

            if ((i + 1) % 8 === 0)
                value += "\n";
        }

        value += "```";

        embed.addFields({
            name: "\u200B",
            value
        });
    }

    return embed;
}

async function updateTable() {

    if (!tableMessageId) return;
    if (!tableChannelId) return;
    try {

        const channel =
            await client.channels.fetch(
                tableChannelId
            );

        const msg =
            await channel.messages.fetch(
                tableMessageId
            );

        await msg.edit({
            embeds: [
                createNumberTableEmbed(players)
            ]
        });

    } catch (err) {

        tableMessageId = null;
        tableChannelId = null;

        saveData();

        console.log(
            "ตารางถูกลบ ต้องสร้างใหม่ด้วย !ตาราง"
        );

    }
}

client.once("clientReady", () => {

    console.log(
        `ล็อกอินสำเร็จ ${client.user.tag}`
    );

});
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    const args = message.content.split(" ");

    // ==================
    // เลือกเลข
    // ==================

    if (args[0] === "!เลข") {

        if (!openNumber)
            return message.channel.send(
                "❌ ตอนนี้ปิดรับเลขแล้ว"
            );

        const number = args[1];

        if (!/^\d{2}$/.test(number))
            return message.channel.send(
                "❌ ใส่เลข 2 ตัว เช่น 29"
            );

        if (
    players.find(
        p =>
            p.userId ===
            message.author.id
    )
) {

    await tempMessage(
        message.channel,
        "❌ คุณเลือกเลขไปแล้ว"
    );

    return;

}

const sameNum =
    players.filter(
        p =>
            p.number ===
            number
    );

if (sameNum.length >= 2) {

    await tempMessage(
        message.channel,
        `❌ เลข ${number} ถูกเลือกครบ 2 คนแล้ว`
    );

    return;

}

players.push({
    userId: message.author.id,
    number
});

saveData();

await updateTable();

await tempMessage(
    message.channel,
    `✅ บันทึกเลขของคุณ: ${number}`
);

return;

}
    // ==================
    // ตาราง
    // ==================

    if (args[0] === "!ตาราง") {

        const embed =
            createNumberTableEmbed(
                players
            );

        const msg =
            await message.channel.send({
                embeds: [embed]
            });

        tableMessageId = msg.id;
        tableChannelId = msg.channel.id;

        saveData();

        return;
    }
    // ==================
    // สุ่มออนไลน์
    // ==================

    if (args[0] === "!สุ่ม") {

        await message.guild.members.fetch();

        const onlineMembers =
            message.guild.members.cache.filter(
                m =>
                    !m.user.bot &&
                    m.presence?.status === "online"
            );

        if (onlineMembers.size === 0) {

            return message.channel.send(
                "❌ ไม่มีผู้เล่นออนไลน์ตอนนี้"
            );

        }

        const winner =
            onlineMembers.random();

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "🎲 ผู้โชคดีออนไลน์"
                )
                .setDescription(
                    `💛 <@${winner.id}>`
                )
                .setColor(0xFFD6E9);

        return message.channel.send({
            embeds: [embed]
        });
    }

    // ==================
    // ออกผล
    // ==================

    if (args[0] === "!ออก") {

        if (message.author.id !== ADMIN_ID)
            return message.channel.send(
                "❌ สำหรับแอดมินเท่านั้น"
            );

        const number = args[1];

        if (!/^\d{2}$/.test(number))
            return message.channel.send(
                "❌ ใส่เลข 2 ตัว เช่น 29"
            );

        await message.guild.members.fetch();

        const winners = players
            .filter(
                p => p.number === number
            )
            .map(
                p =>
                    message.guild.members.cache.get(
                        p.userId
                    )
            )
            .filter(Boolean);

        const embed =
            new EmbedBuilder()
                .setTitle(
                    `🎉 ประกาศเลขที่ออก: ${number}`
                )
                .setColor(0xFFD6E9);
        if (winners.length === 0) {

            embed.setDescription(`
❌ ไม่มีผู้ชนะในรอบนี้

ขอบคุณทุกคนที่ร่วมสนุก 🐱✨
`);

        } else {

            embed.setDescription(`
💌 ขอแสดงความยินดี

${winners
    .map(
        (w, i) =>
            `🏆 ${i + 1}. <@${w.id}>`
    )
    .join("\n")}

🎊 ยินดีด้วย 🎊
`);

        }

        await message.channel.send({
            embeds: [embed]
        });

        players = [];

        saveData();

        await updateTable();

        return;
    }
    // ==================
    // ล้างข้อมูล
    // ==================

    if (args[0] === "!ล้าง") {

        if (message.author.id !== ADMIN_ID)
            return message.channel.send(
                "❌ สำหรับแอดมินเท่านั้น"
            );

        players = [];

        saveData();

        await updateTable();

        return message.channel.send(
            "🧹 ล้างตัวเลขทั้งหมดเรียบร้อยแล้ว ✅"
        );
    }

    // ==================
    // เปิดรับเลข
    // ==================

    if (args[0] === "!เปิดคับ") {

        if (message.author.id !== ADMIN_ID)
            return message.channel.send(
                "❌ สำหรับแอดมินเท่านั้น"
            );

        openNumber = true;

        saveData();

        return message.channel.send(
            "✅ เปิดรับเลขแล้ว ผู้เล่นสามารถพิมพ์ !เลข <เลข>"
        );
    }

    // ==================
    // ปิดรับเลข
    // ==================

    if (args[0] === "!ปิดคับ") {

        if (message.author.id !== ADMIN_ID)
            return message.channel.send(
                "❌ สำหรับแอดมินเท่านั้น"
            );

        openNumber = false;

        saveData();

        return message.channel.send(
            "⏰ ปิดรับเลขแล้ว"
        );
    }
});
// ==================
// Error Handler
// ==================

process.on("unhandledRejection", err => {

    console.error(
        "Unhandled Rejection:",
        err
    );

});

process.on("uncaughtException", err => {

    console.error(
        "Uncaught Exception:",
        err
    );

});

// ==================
// Login
// ==================

client.login("MTUxNzIxNjIzMzk1MzQyNzUxNg.GfYzEn.iMAj1ORLG-rgVxVMkb-l4EYPT_h1prkUbq80iY");
