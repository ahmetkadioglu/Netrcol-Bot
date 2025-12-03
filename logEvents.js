// events/logEvents.js - SERVER & EMOJI LOGS (ENGLISH)
const { Events } = require('discord.js');
const helpers = require('../utils/helpers');

module.exports = {
    // 1. SUNUCU GÜNCELLEMELERİ (İsim, İkon vb.)
    guildUpdate: {
        name: Events.GuildUpdate,
        async execute(oldGuild, newGuild) {
            // İsim Değişikliği
            if (oldGuild.name !== newGuild.name) {
                await helpers.sendLog(newGuild, {
                    type: 'server_update',
                    title: '✏️ Server Name Changed',
                    description: 'The server name has been updated.',
                    fields: [
                        { name: 'Old Name', value: oldGuild.name, inline: true },
                        { name: 'New Name', value: newGuild.name, inline: true }
                    ],
                    color: '#FEE75C'
                });
            }

            // İkon Değişikliği
            if (oldGuild.icon !== newGuild.icon) {
                await helpers.sendLog(newGuild, {
                    type: 'server_update',
                    title: '🖼️ Server Icon Changed',
                    description: 'The server icon has been updated.',
                    thumbnail: newGuild.iconURL(),
                    color: '#FEE75C'
                });
            }
        }
    },

    // 2. EMOJI OLUŞTURMA
    emojiCreate: {
        name: Events.GuildEmojiCreate,
        async execute(emoji) {
            await helpers.sendLog(emoji.guild, {
                type: 'emoji_create',
                title: '😀 Emoji Created',
                description: `A new emoji **${emoji.name}** has been added.`,
                fields: [
                    { name: 'Emoji', value: `<:${emoji.name}:${emoji.id}>`, inline: true },
                    { name: 'ID', value: emoji.id, inline: true }
                ],
                thumbnail: emoji.url,
                color: '#57F287'
            });
        }
    },

    // 3. EMOJI SİLME
    emojiDelete: {
        name: Events.GuildEmojiDelete,
        async execute(emoji) {
            await helpers.sendLog(emoji.guild, {
                type: 'emoji_delete',
                title: '🗑️ Emoji Deleted',
                description: `The emoji **${emoji.name}** has been deleted.`,
                fields: [
                    { name: 'Name', value: emoji.name, inline: true },
                    { name: 'ID', value: emoji.id, inline: true }
                ],
                thumbnail: emoji.url,
                color: '#ED4245'
            });
        }
    }
};