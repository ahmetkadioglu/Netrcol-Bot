// config/config.js - TAM GÜNCELLENMİŞ HAL
require('dotenv').config();
const crypto = require('crypto');

const { PermissionsBitField } = require("discord.js");

module.exports = {
    // ⚠️ KRİTİK AYARLAR - GÜVENLİ VERSİYON
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackUrl: process.env.CALLBACK_URL,
    
    token: (() => {
        const token = process.env.TOKEN;
        if (!token) {
            console.error('\n❌❌❌ KRİTİK HATA: DISCORD_TOKEN bulunamadı!');
            console.error('   Discord Developer Portal\'dan token alın:');
            console.error('   https://discord.com/developers/applications');
            console.error('   .env dosyanıza ekleyin: TOKEN=your_token_here');
            process.exit(1);
        }
        return token;
    })(),
    
    mongoUri: (() => {
        const uri = process.env.MONGO_URI;
        if (!uri || uri.includes('your_mongodb_uri_here')) {
            console.error('\n❌❌❌ KRİTİK HATA: MONGO_URI bulunamadı!');
            console.error('   .env dosyanıza şunu ekleyin:');
            console.error('   MONGO_URI=mongodb://localhost:27017/netrcol');
            console.error('   Veya MongoDB Atlas için:');
            console.error('   MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/veritabani');
            process.exit(1);
        }
        return uri;
    })(),
    
    ownerId: process.env.OWNER_ID,
    
    // 💎 ELMAS SEVİYE SESSION SECRET - GÜVENLİ VERSİYON
    sessionSecret: (() => {
        const secret = process.env.SESSION_SECRET;
        
        // Production kontrolü
        if (process.env.NODE_ENV === 'production') {
            if (!secret) {
                console.error('\n❌❌❌ PRODUCTION HATASI: SESSION_SECRET GEREKLİ!');
                console.error('   .env dosyanıza şunu ekleyin:');
                console.error('   SESSION_SECRET=' + crypto.randomBytes(64).toString('hex'));
                process.exit(1);
            }
            if (secret.length < 32) {
                console.error('❌ UYARI: Production\'da session secret en az 32 karakter olmalı!');
            }
            return secret;
        }
        
        // Development modu
        if (!secret) {
            const devSecret = 'dev-' + crypto.randomBytes(32).toString('hex');
            console.warn('\n⚠️  UYARI: SESSION_SECRET bulunamadı!');
            console.warn('   Development için otomatik oluşturuldu:', devSecret.substring(0, 20) + '...');
            console.warn('   Production için .env dosyanıza ekleyin!');
            return devSecret;
        }
        
        return secret;
    })(),
    
    // Bot Configuration
    bot: {
        name: "Netrcol Bot",
        version: "3.2.0",
        status: process.env.STATUS || 'online',
        activity: {
            name: process.env.ACTIVITY_NAME || 'Discord Server!',
            type: parseInt(process.env.ACTIVITY_TYPE || '0')
        }
    },

    // Diğer ayarlar aynı kalabilir...
    features: {
        moderation: process.env.ENABLE_MODERATION === 'true',
        tickets: process.env.ENABLE_TICKETS === 'true',
        logging: process.env.ENABLE_LOGGING === 'true',
        backup: process.env.ENABLE_BACKUP === 'true',
        cleanup: process.env.ENABLE_CLEANUP === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true'
    },
    
    // Database settings
    database: {
        name: process.env.DB_NAME || 'netrcol_bot',
        prefix: process.env.DB_COLLECTION_PREFIX || 'netrcol_'
    },
    
    // Log settings
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
        debug: process.env.DEBUG === 'true'
    },
    
    // Channel settings
    channels: {
        adminLog: process.env.ADMIN_LOG_CHANNEL_ID,
        ownerLog: process.env.OWNER_LOG_CHANNEL_ID
    },
    
    // Performance settings
    performance: {
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
        maxCommandsPerMinute: parseInt(process.env.MAX_COMMANDS_PER_MINUTE || '30'),
        backupIntervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24'),
        cleanupDays: parseInt(process.env.CLEANUP_DAYS || '30')
    },
    
    // Security settings
    security: {
        require2FA: process.env.REQUIRE_2FA === 'true',
        maxBanDurationDays: parseInt(process.env.MAX_BAN_DURATION_DAYS || '30')
    },

    // Theme Configuration
    theme: {
        color: "#5865F2",
        colors: {
            primary: "#5865F2",
            success: "#57F287",
            error: "#ED4245",
            warning: "#FEE75C",
            info: "#5865F2"
        },
        footer: {
            text: "Netrcol Bot v3.2.0"
        }
    },

    // Emoji Configuration
    emojis: {
        ban: "🔨",
        clear: "🧹",
        lock: "🔒",
        unlock: "🔓",
        timeout: "⏰",
        info: "ℹ️",
        approved: "✅",
        canceled: "❌",
        users: "👥",
        settings: "⚙️",
        boost: "🚀",
        boostLevel: "💎",
        roles: "🎭",
        folder: "📁",
        calendar: "📅",
        owner: "👑",
        region: "🌍",
        ticket: "🎫",
        ping: "🏓",
        kick: "👢",
        unban: "🔓"
    },

    // Permission Configuration
    permissions: {
        admin: [PermissionsBitField.Flags.Administrator],
        moderator: [
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.ModerateMembers
        ],
        support: [
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageMessages
        ]
    }
};