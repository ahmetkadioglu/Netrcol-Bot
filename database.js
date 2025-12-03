// utils/database.js - FULL VERSION (ALL SYSTEMS + VPN FIX)
const { MongoClient } = require('mongodb');
const { mongoUri } = require('../config/config');

class Database {
    constructor() {
        // VPN ve Bağlantı Kopması için Özel Ayarlar
        this.client = new MongoClient(mongoUri, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            tls: true,
            tlsAllowInvalidCertificates: true
        });
        
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) return;

        try {
            console.log('🔗 Database bağlanıyor...');
            await this.client.connect();
            this.db = this.client.db();
            this.isConnected = true;
            console.log('✅ MongoDB bağlantısı başarılı!');
            
            await this.init();
        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);
        }
    }

    async init() {
        const collections = [
            'guild_settings', 'ticket_settings', 'ticket_categories',
            'activity_logs', 'ticket_channels', 'user_data',
            'registration_settings', 'giveaways',
            'jtc_settings', 'jtc_channels', 'welcome_settings',
            'warnings', 'jailed_users'
        ];

        for (const colName of collections) {
            await this.checkCollection(colName);
        }
        
        // İndeksleri Oluştur (Hata verirse devam et)
        try { await this.db.collection('ticket_channels').createIndex({ guildId: 1, channelId: 1 }); } catch (e) {}
        try { await this.db.collection('jtc_channels').createIndex({ channelId: 1 }); } catch (e) {}
        try { await this.db.collection('giveaways').createIndex({ ended: 1 }); } catch (e) {}
        
        console.log('✅ Database hazır');
    }

    async checkCollection(name) {
        try {
            const collections = await this.db.listCollections({ name }).toArray();
            if (collections.length === 0) {
                await this.db.createCollection(name);
            }
        } catch (e) {}
    }

    // ========== GIVEAWAY SYSTEM (BU EKSİKTİ) ==========
    async createGiveaway(data) { 
        if (!this.isConnected) return null;
        return await this.db.collection('giveaways').insertOne(data); 
    }

    async getActiveGiveaways() { 
        if (!this.isConnected) return [];
        return await this.db.collection('giveaways').find({ ended: false }).toArray(); 
    }

    async getGiveaway(messageId) { 
        if (!this.isConnected) return null;
        return await this.db.collection('giveaways').findOne({ messageId: messageId }); 
    }

    async addParticipant(messageId, userId) { 
        if (!this.isConnected) return null;
        return await this.db.collection('giveaways').updateOne({ messageId: messageId }, { $addToSet: { participants: userId } }); 
    }

    async endGiveaway(messageId, winners) { 
        if (!this.isConnected) return null;
        return await this.db.collection('giveaways').updateOne({ messageId: messageId }, { $set: { ended: true, winners: winners, endedAt: new Date() } }); 
    }

    // ========== TICKET SYSTEM ==========
    async getTicketSettings(guildId) { 
        if (!this.isConnected) return { enabled: false };
        return await this.db.collection('ticket_settings').findOne({ guildId: guildId.toString() }) || { enabled: false }; 
    }
    async saveTicketSettings(guildId, settings) { 
        if (!this.isConnected) return;
        return await this.db.collection('ticket_settings').updateOne({ guildId: guildId.toString() }, { $set: settings }, { upsert: true }); 
    }
    async getTicketCategories(guildId) { 
        if (!this.isConnected) return [];
        return await this.db.collection('ticket_categories').find({ guildId: guildId.toString() }).toArray(); 
    }
    async saveTicketCategory(guildId, categoryData) { 
        if (!this.isConnected) return;
        return await this.db.collection('ticket_categories').updateOne({ guildId: guildId.toString(), id: categoryData.id }, { $set: { ...categoryData, createdAt: new Date() } }, { upsert: true }); 
    }
    async deleteTicketCategory(guildId, categoryId) { 
        if (!this.isConnected) return;
        return await this.db.collection('ticket_categories').deleteOne({ guildId: guildId.toString(), id: categoryId }); 
    }
    async saveTicketChannel(guildId, channelId, userId, categoryId = null) { 
        if (!this.isConnected) return;
        return await this.db.collection('ticket_channels').updateOne({ guildId: guildId.toString(), channelId: channelId.toString() }, { $set: { userId: userId.toString(), categoryId: categoryId, status: 'open', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true }); 
    }
    async getTicketChannel(guildId, channelId) { 
        if (!this.isConnected) return null;
        return await this.db.collection('ticket_channels').findOne({ guildId: guildId.toString(), channelId: channelId.toString() }); 
    }
    async getUserTickets(guildId, userId) { 
        if (!this.isConnected) return [];
        return await this.db.collection('ticket_channels').find({ guildId: guildId.toString(), userId: userId.toString() }).toArray(); 
    }
    async deleteTicketChannel(guildId, channelId) { 
        if (!this.isConnected) return;
        return await this.db.collection('ticket_channels').deleteOne({ guildId: guildId.toString(), channelId: channelId.toString() }); 
    }
    async getTicketCount(guildId) {
        if (!this.isConnected) return 0;
        return await this.db.collection('ticket_channels').countDocuments({ guildId: guildId.toString() });
    }

    // ========== REGISTRATION SYSTEM ==========
    async getRegistrationSettings(guildId) { 
        if (!this.isConnected) return {};
        return await this.db.collection('registration_settings').findOne({ guildId: guildId.toString() }) || {}; 
    }
    async saveRegistrationSettings(guildId, settings) { 
        if (!this.isConnected) return;
        return await this.db.collection('registration_settings').updateOne({ guildId: guildId.toString() }, { $set: settings }, { upsert: true }); 
    }

    // ========== WELCOME SYSTEM ==========
    async getWelcomeSettings(guildId) { 
        if (!this.isConnected) return { enabled: false };
        return await this.db.collection('welcome_settings').findOne({ guildId: guildId.toString() }) || { enabled: false }; 
    }
    async saveWelcomeSettings(guildId, settings) { 
        if (!this.isConnected) return;
        return await this.db.collection('welcome_settings').updateOne({ guildId: guildId.toString() }, { $set: settings }, { upsert: true }); 
    }

    // ========== JOIN TO CREATE (JTC) SYSTEM ==========
    async getJTCSettings(guildId) { 
        if (!this.isConnected) return {};
        return await this.db.collection('jtc_settings').findOne({ guildId: guildId.toString() }) || {}; 
    }
    async saveJTCSettings(guildId, settings) { 
        if (!this.isConnected) return;
        return await this.db.collection('jtc_settings').updateOne({ guildId: guildId.toString() }, { $set: settings }, { upsert: true }); 
    }
    async addActiveJTC(channelId, ownerId, guildId) { 
        if (!this.isConnected) return;
        return await this.db.collection('jtc_channels').insertOne({ channelId, ownerId, guildId, createdAt: new Date() }); 
    }
    async getActiveJTC(channelId) { 
        if (!this.isConnected) return null;
        return await this.db.collection('jtc_channels').findOne({ channelId }); 
    }
    async removeActiveJTC(channelId) { 
        if (!this.isConnected) return;
        return await this.db.collection('jtc_channels').deleteOne({ channelId }); 
    }

    // ========== MODERATION (WARN/JAIL) ==========
    async addWarning(guildId, userId, moderatorId, reason) {
        if (!this.isConnected) return;
        return await this.db.collection('warnings').insertOne({ guildId, userId, moderatorId, reason, timestamp: new Date(), caseId: Date.now().toString().slice(-6) });
    }
    async getWarnings(guildId, userId) {
        if (!this.isConnected) return [];
        return await this.db.collection('warnings').find({ guildId, userId }).toArray();
    }
    async setJail(guildId, userId, roles) {
        if (!this.isConnected) return;
        return await this.db.collection('jailed_users').updateOne({ guildId, userId }, { $set: { roles, jailedAt: new Date() } }, { upsert: true });
    }
    async getJail(guildId, userId) {
        if (!this.isConnected) return null;
        return await this.db.collection('jailed_users').findOne({ guildId, userId });
    }
    async removeJail(guildId, userId) {
        if (!this.isConnected) return;
        return await this.db.collection('jailed_users').deleteOne({ guildId, userId });
    }

    // ========== GENERAL ==========
    async getGuildSettings(guildId) { 
        if (!this.isConnected) return {};
        return await this.db.collection('guild_settings').findOne({ guildId: guildId.toString() }) || {}; 
    }
    async saveGuildSettings(guildId, settings) { 
        if (!this.isConnected) return;
        return await this.db.collection('guild_settings').updateOne({ guildId: guildId.toString() }, { $set: settings }, { upsert: true }); 
    }

    async healthCheck() {
        try {
            if (!this.isConnected) return { status: 'disconnected' };
            await this.db.command({ ping: 1 });
            return { status: 'connected', latency: 'OK' };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = new Database();