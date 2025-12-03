// events/channelEvents.js - ENGLISH LOGS
const { Events, ChannelType } = require('discord.js');
const helpers = require('../utils/helpers');

module.exports = {
    channelCreate: {
        name: Events.ChannelCreate,
        async execute(channel) {
            if (!channel.guild) return;
            
            await helpers.sendLog(channel.guild, {
                type: 'channel_create',
                title: '🆕 Channel Created',
                description: `A new channel named **#${channel.name}** was created.`,
                fields: [
                    { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
                    { name: 'ID', value: channel.id, inline: true }
                ],
                color: '#57F287'
            });
        }
    },
    channelDelete: {
        name: Events.ChannelDelete,
        async execute(channel) {
            if (!channel.guild) return;

            await helpers.sendLog(channel.guild, {
                type: 'channel_delete',
                title: '🗑️ Channel Deleted',
                description: `The channel **#${channel.name}** was deleted.`,
                fields: [
                    { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
                    { name: 'ID', value: channel.id, inline: true }
                ],
                color: '#ED4245'
            });
        }
    },
    channelUpdate: {
        name: Events.ChannelUpdate,
        async execute(oldChannel, newChannel) {
            if (!oldChannel.guild) return;
            if (oldChannel.name === newChannel.name) return; // Sadece isim değişikliğini logla (Spam olmasın)

            await helpers.sendLog(newChannel.guild, {
                type: 'channel_update',
                title: '📝 Channel Renamed',
                description: `Channel **#${oldChannel.name}** was renamed to **#${newChannel.name}**.`,
                fields: [
                    { name: 'Old Name', value: oldChannel.name, inline: true },
                    { name: 'New Name', value: newChannel.name, inline: true }
                ],
                color: '#FEE75C'
            });
        }
    }
};

function getChannelTypeName(type) {
    switch (type) {
        case ChannelType.GuildText: return 'Text Channel';
        case ChannelType.GuildVoice: return 'Voice Channel';
        case ChannelType.GuildCategory: return 'Category';
        case ChannelType.GuildAnnouncement: return 'Announcement';
        case ChannelType.GuildStageVoice: return 'Stage';
        case ChannelType.GuildForum: return 'Forum';
        default: return 'Unknown';
    }
}