// events/roleEvents.js - ENGLISH LOGS
const { Events } = require('discord.js');
const helpers = require('../utils/helpers');

module.exports = {
    roleCreate: {
        name: Events.GuildRoleCreate,
        async execute(role) {
            await helpers.sendLog(role.guild, {
                type: 'role_create',
                title: '🛡️ Role Created',
                description: `A new role named **${role.name}** has been created.`,
                fields: [
                    { name: 'Role', value: `${role}`, inline: true },
                    { name: 'ID', value: role.id, inline: true }
                ],
                color: '#57F287'
            });
        }
    },
    roleDelete: {
        name: Events.GuildRoleDelete,
        async execute(role) {
            await helpers.sendLog(role.guild, {
                type: 'role_delete',
                title: '🗑️ Role Deleted',
                description: `The role **${role.name}** has been deleted.`,
                fields: [
                    { name: 'Role Name', value: role.name, inline: true },
                    { name: 'ID', value: role.id, inline: true }
                ],
                color: '#ED4245'
            });
        }
    }
};