// events/voiceEvents.js - ENGLISH LOGS
const { Events } = require('discord.js');
const helpers = require('../utils/helpers');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        const guild = newState.guild || oldState.guild;

        // 1. Kanal Değiştirme (Switch)
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            await helpers.sendLog(guild, {
                type: 'voice_move',
                title: '↔️ Switched Voice Channel',
                description: `**${member.user.tag}** moved to another voice channel.`,
                fields: [
                    { name: 'User', value: `${member}`, inline: true },
                    { name: 'Old Channel', value: `<#${oldState.channelId}>`, inline: true },
                    { name: 'New Channel', value: `<#${newState.channelId}>`, inline: true }
                ],
                color: '#5865F2',
                thumbnail: member.user.displayAvatarURL()
            });
        }
        // 2. Kanala Katılma (Join)
        else if (!oldState.channelId && newState.channelId) {
            await helpers.sendLog(guild, {
                type: 'voice_join',
                title: 'Mw Joined Voice Channel',
                description: `**${member.user.tag}** joined a voice channel.`,
                fields: [
                    { name: 'User', value: `${member}`, inline: true },
                    { name: 'Channel', value: `<#${newState.channelId}>`, inline: true }
                ],
                color: '#57F287',
                thumbnail: member.user.displayAvatarURL()
            });
        }
        // 3. Kanaldan Ayrılma (Leave)
        else if (oldState.channelId && !newState.channelId) {
            await helpers.sendLog(guild, {
                type: 'voice_leave',
                title: '🔇 Left Voice Channel',
                description: `**${member.user.tag}** left a voice channel.`,
                fields: [
                    { name: 'User', value: `${member}`, inline: true },
                    { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }
                ],
                color: '#ED4245',
                thumbnail: member.user.displayAvatarURL()
            });
        }
    },
};