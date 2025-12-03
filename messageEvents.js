// events/messageEvents.js - ENGLISH LOGS
const { Events } = require('discord.js');
const helpers = require('../utils/helpers');

module.exports = {
    messageDelete: {
        name: Events.MessageDelete,
        async execute(message) {
            if (!message.guild || message.author?.bot) return;

            await helpers.sendLog(message.guild, {
                type: 'message_delete',
                title: '🗑️ Message Deleted',
                description: `A message by ${message.author} was deleted in ${message.channel}.`,
                fields: [
                    { name: 'Content', value: message.content ? message.content.substring(0, 1024) : '*[No Content/Image]*', inline: false },
                    { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Channel', value: `${message.channel.name}`, inline: true }
                ],
                color: '#ED4245'
            });
        }
    },
    messageUpdate: {
        name: Events.MessageUpdate,
        async execute(oldMessage, newMessage) {
            if (!oldMessage.guild || oldMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return; // Sadece içerik değiştiyse

            await helpers.sendLog(oldMessage.guild, {
                type: 'message_edit',
                title: '✏️ Message Edited',
                description: `A message by ${oldMessage.author} was edited in ${oldMessage.channel}.`,
                fields: [
                    { name: 'Original', value: oldMessage.content ? oldMessage.content.substring(0, 1024) : '*[Empty]*', inline: false },
                    { name: 'New', value: newMessage.content ? newMessage.content.substring(0, 1024) : '*[Empty]*', inline: false },
                    { name: 'Link', value: `[Jump to Message](${newMessage.url})`, inline: false }
                ],
                color: '#FEE75C' // Yellow
            });
        }
    }
};