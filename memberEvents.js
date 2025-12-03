// events/memberEvents.js - JAIL PROTECTION + WELCOME + LOGS
const { Events, EmbedBuilder } = require('discord.js');
const helpers = require('../utils/helpers');
const db = require('../utils/database');
const { createWelcomeCard } = require('../utils/welcomeGenerator');

// Hoş Geldin Mesajı Fonksiyonu (Test komutu için dışa açık)
async function welcomeMember(member) {
    try {
        const settings = await db.getWelcomeSettings(member.guild.id);
        if (!settings || !settings.enabled || !settings.channelId) return;

        const channel = member.guild.channels.cache.get(settings.channelId);
        if (!channel) return;

        // Mesajı hazırla
        let content = settings.customMessage || 'Welcome {user} to **{server}**! Member #{count}';
        content = content
            .replace('{user}', member.toString())
            .replace('{server}', member.guild.name)
            .replace('{count}', member.guild.memberCount);

        // 1. TİP: RESİMLİ (IMAGE)
        if (settings.type === 'image') {
            const attachment = await createWelcomeCard(member, settings.backgroundUrl);
            await channel.send({ content: content, files: [attachment] });
        } 
        // 2. TİP: YAZILI (TEXT/EMBED)
        else {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(content)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
            
            await channel.send({ content: member.toString(), embeds: [embed] });
        }

    } catch (error) {
        console.error('Welcome system error:', error);
    }
}

module.exports = {
    // Test komutu için export
    welcomeMember,

    guildMemberAdd: {
        name: Events.GuildMemberAdd,
        async execute(member) {
            // --- 1. JAIL KONTROLÜ (ANTI-EVASION) ---
            // Eğer kullanıcı hapisteyken çıkıp girdiyse, tekrar hapse at.
            const jailData = await db.getJail(member.guild.id, member.id);
            if (jailData) {
                const jailRole = member.guild.roles.cache.find(r => r.name === 'Jailed');
                if (jailRole) {
                    await member.roles.set([jailRole.id]).catch(e => console.log('Jail evasion fix failed:', e));
                    // Jail'li olduğu için Hoş Geldin mesajı atma, fonksiyondan çık.
                    return; 
                }
            }

            // --- 2. LOG GÖNDER ---
            await helpers.sendLog(member.guild, {
                type: 'member_join',
                title: '📥 Member Joined',
                description: `**${member.user.tag}** joined the server.`,
                fields: [
                    { name: 'User Info', value: `${member} (${member.id})`, inline: true },
                    { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                ],
                thumbnail: member.user.displayAvatarURL(),
                color: '#57F287'
            });

            // --- 3. HOŞ GELDİN MESAJI ---
            await welcomeMember(member);
        }
    },

    guildMemberRemove: {
        name: Events.GuildMemberRemove,
        async execute(member) {
            await helpers.sendLog(member.guild, {
                type: 'member_leave',
                title: '📤 Member Left',
                description: `**${member.user.tag}** left the server.`,
                fields: [
                    { name: 'User Info', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: 'Joined At', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                ],
                thumbnail: member.user.displayAvatarURL(),
                color: '#ED4245'
            });
        }
    },

    guildBanAdd: {
        name: Events.GuildBanAdd,
        async execute(ban) {
            await helpers.sendLog(ban.guild, { 
                type: 'member_ban', 
                title: '🔨 Member Banned', 
                description: `**${ban.user.tag}** was banned from the server.`,
                fields: [{ name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true }], 
                color: '#000000' 
            });
        }
    },

    guildBanRemove: {
        name: Events.GuildBanRemove,
        async execute(ban) {
            await helpers.sendLog(ban.guild, { 
                type: 'member_unban', 
                title: '🔓 Member Unbanned', 
                description: `**${ban.user.tag}** was unbanned.`,
                fields: [{ name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true }], 
                color: '#57F287' 
            });
        }
    }
};