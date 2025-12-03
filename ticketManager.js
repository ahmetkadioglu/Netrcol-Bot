// utils/ticketManager.js - SMART TOPICS & AUTO ID
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');
const defaultTopics = require('../data/defaultTopics');
const logger = require('./logger');

class TicketManager {
    constructor() {
        this.setupSessions = new Map();
        this.sessionTimeouts = new Map();
        setInterval(() => this.cleanupSessions(), 10 * 60 * 1000);
        logger.info('Ticket Manager initialized');
    }

    // --- SMART TOPIC LOGIC (İSTEDİĞİN ÖZELLİK) ---
    async getAvailableTopics(guildId) {
        try {
            const customTopics = await db.getTicketCategories(guildId);
            
            // Eğer özel konu eklendiyse SADECE onları döndür
            if (customTopics.length > 0) {
                return customTopics;
            }
            
            // Hiç özel konu yoksa VARSAYILANLARI döndür
            return defaultTopics;
        } catch (error) {
            logger.error('Error getting topics:', error);
            return defaultTopics;
        }
    }

    async addTopic(guildId, name, description, emoji, staffRole) {
        try {
            // ID'yi otomatik oluştur (Örn: "Server Support" -> "server-support")
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);

            const topicData = {
                id: id,
                name: name,
                description: description || 'No description',
                emoji: emoji || '🎫',
                staffRoleId: staffRole?.id || null
            };

            const result = await db.saveTicketCategory(guildId, topicData);
            if (result) logger.info(`Topic added: ${guildId} - ${name}`);
            return result;
        } catch (error) {
            logger.error('Error adding topic:', error);
            return false;
        }
    }

    // --- PANEL SENDER ---
    async sendTicketPanel(channel, guildId) {
        try {
            const settings = await db.getTicketSettings(guildId);
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(settings.panelTitle || '🎫 Create a Support Ticket')
                .setDescription(settings.panelDescription || 'Click the button below to open a ticket.')
                .setFooter({ text: 'Powered by Netrcol Bot' })
                .setTimestamp();

            const createBtn = new ButtonBuilder().setCustomId('create_ticket').setLabel(settings.panelBtnCreate || 'Create Ticket').setStyle(settings.styleCreate || ButtonStyle.Success).setEmoji('🎫');
            const rulesBtn = new ButtonBuilder().setCustomId('ticket_rules').setLabel(settings.panelBtnRules || 'Rules').setStyle(settings.styleRules || ButtonStyle.Secondary).setEmoji('📜');
            const row = new ActionRowBuilder().addComponents(createBtn, rulesBtn);

            await channel.send({ embeds: [embed], components: [row] });
            return true;
        } catch (error) {
            logger.error(`Error sending panel: ${error.message}`);
            return false;
        }
    }

    async refreshPanel(guild) {
        try {
            const settings = await db.getTicketSettings(guild.id);
            if (!settings || !settings.creationChannelId) return false;
            const channel = guild.channels.cache.get(settings.creationChannelId);
            if (!channel) return false;
            const messages = await channel.messages.fetch({ limit: 10 });
            const panelMessage = messages.find(m => m.author.id === guild.client.user.id && m.embeds.length > 0 && m.components.length > 0);

            if (panelMessage) {
                const embed = new EmbedBuilder().setColor('#5865F2').setTitle(settings.panelTitle || '🎫 Create a Support Ticket').setDescription(settings.panelDescription || 'Click the button below to open a ticket.').setFooter({ text: 'Powered by Netrcol Bot' }).setTimestamp();
                const createBtn = new ButtonBuilder().setCustomId('create_ticket').setLabel(settings.panelBtnCreate || 'Create Ticket').setStyle(settings.styleCreate || ButtonStyle.Success).setEmoji('🎫');
                const rulesBtn = new ButtonBuilder().setCustomId('ticket_rules').setLabel(settings.panelBtnRules || 'Rules').setStyle(settings.styleRules || ButtonStyle.Secondary).setEmoji('📜');
                const row = new ActionRowBuilder().addComponents(createBtn, rulesBtn);
                await panelMessage.edit({ embeds: [embed], components: [row] });
                return true;
            }
            return false;
        } catch (e) { return false; }
    }

    // --- STANDART METOTLAR ---
    startSetup(userId, guildId) {
        const sessionKey = `${guildId}-${userId}`;
        if (this.setupSessions.has(sessionKey)) this.endSetup(guildId, userId);
        const session = { userId, guildId, step: 0, data: { creationChannelId: null, discordCategoryId: null, staffRoleId: null, logChannelId: null, topicSystem: false }, createdAt: Date.now(), lastActivity: Date.now() };
        this.setupSessions.set(sessionKey, session);
        const timeout = setTimeout(() => { if (this.setupSessions.has(sessionKey)) { this.setupSessions.delete(sessionKey); this.sessionTimeouts.delete(sessionKey); } }, 45 * 60 * 1000);
        this.sessionTimeouts.set(sessionKey, timeout);
        return session;
    }
    getSetupSession(guildId, userId) {
        const session = this.setupSessions.get(`${guildId}-${userId}`);
        if (session) { session.lastActivity = Date.now(); this.setupSessions.set(`${guildId}-${userId}`, session); }
        return session;
    }
    updateSetupSession(guildId, userId, updates) {
        const session = this.setupSessions.get(`${guildId}-${userId}`);
        if (session) Object.assign(session, updates, { lastActivity: Date.now() });
        return session;
    }
    endSetup(guildId, userId) {
        const key = `${guildId}-${userId}`;
        const timeout = this.sessionTimeouts.get(key);
        if (timeout) clearTimeout(timeout);
        this.sessionTimeouts.delete(key);
        this.setupSessions.delete(key);
    }
    cleanupSessions() {
        const now = Date.now();
        for (const [key, session] of this.setupSessions.entries()) {
            if (now - session.lastActivity > 30 * 60 * 1000) {
                clearTimeout(this.sessionTimeouts.get(key));
                this.sessionTimeouts.delete(key);
                this.setupSessions.delete(key);
            }
        }
    }
    async isTopicSystemEnabled(guildId) { try { const s = await db.getTicketSettings(guildId); return s?.topicSystem || false; } catch { return false; } }
    async getTopicById(guildId, id) { try { const t = await this.getAvailableTopics(guildId); return t.find(x => x.id === id) || null; } catch { return null; } }
    async removeTopic(guildId, id) { return await db.deleteTicketCategory(guildId, id); }
    getStats() { return { activeSessions: this.setupSessions.size }; }
    healthCheck() { return { status: 'healthy', uptime: process.uptime() }; }
    generateTicketNumber() { return Date.now().toString().slice(-6); }
    generateChannelName(user, num, topic) {
        const base = `ticket-${user.toLowerCase().replace(/[^a-z0-9]/g, '')}-${num}`;
        return topic ? `${base}-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 10)}` : base;
    }
    forceCleanup() {
        this.sessionTimeouts.forEach(t => clearTimeout(t));
        this.setupSessions.clear();
        this.sessionTimeouts.clear();
    }
    async createTicketWithTopic(guildId, userId, topicId, interaction = null) {
        return this._handleCreation(guildId, userId, topicId, interaction);
    }
    async createBasicTicket(guildId, userId, interaction = null) {
        return this._handleCreation(guildId, userId, null, interaction);
    }
    async _handleCreation(guildId, userId, topicId, interaction) {
        try {
            const settings = await db.getTicketSettings(guildId);
            if (!settings || !settings.enabled) throw new Error('Ticket system disabled');
            const topics = await this.getAvailableTopics(guildId);
            const topic = topicId ? topics.find(t => t.id === topicId) : null;
            if (topicId && !topic) throw new Error('Invalid topic');
            return { success: true, settings: settings, topic: topic };
        } catch (error) {
            logger.error('Creation error:', error);
            if (interaction && !interaction.replied) await interaction.reply({ content: `❌ Error: ${error.message}`, flags: 64 });
            return { success: false, error: error.message };
        }
    }
}

module.exports = new TicketManager();