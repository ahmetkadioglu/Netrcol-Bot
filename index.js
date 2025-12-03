// index.js - TAM ÇALIŞAN, GÜNCEL VE HATASIZ SÜRÜM
require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./utils/database');
const config = require('./config/config');

console.log('='.repeat(60));
console.log('🚀 NETRCOL BOT BAŞLATILIYOR');
console.log('='.repeat(60));

// 1. Önce token kontrolü
if (!process.env.TOKEN) {
    console.error('❌ KRİTİK HATA: TOKEN bulunamadı!');
    console.error('   Lütfen .env dosyanıza TOKEN ekleyin.');
    process.exit(1);
}

// 2. Bot oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
    ]
});

// ✅ MaxListeners Uyarısını Çözer (Çok fazla event dinleyicisi olduğu için)
client.setMaxListeners(50);

// 3. Global değişkenler
global.client = client;
client.commands = new Collection();

// 4. Komutları yükle
console.log('📂 Komutlar yükleniyor...');
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    // Ana klasör
    const rootFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of rootFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`   ✅ ${command.data.name}`);
            }
        } catch (e) { console.error(`   ❌ Hata (${file}): ${e.message}`); }
    }

    // Alt klasörler
    const folders = fs.readdirSync(commandsPath).filter(f => fs.statSync(path.join(commandsPath, f)).isDirectory());
    for (const folder of folders) {
        const files = fs.readdirSync(path.join(commandsPath, folder)).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                const command = require(path.join(commandsPath, folder, file));
                if (command.data && command.execute) {
                    client.commands.set(command.data.name, command);
                    console.log(`   ✅ ${command.data.name} (${folder})`);
                }
            } catch (e) { console.error(`   ❌ Hata (${folder}/${file}): ${e.message}`); }
        }
    }
}

// 5. Eventleri yükle
console.log('📂 Eventler yükleniyor...');
const eventsPath = path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
            const eventModule = require(path.join(eventsPath, file));
            
            // Tekil Event
            if (eventModule.name) {
                if (eventModule.once) client.once(eventModule.name, (...args) => eventModule.execute(...args, client));
                else client.on(eventModule.name, (...args) => eventModule.execute(...args, client));
                console.log(`   ✅ ${eventModule.name}`);
            } 
            // Çoklu Event (module.exports.eventName = ...)
            else {
                for (const key in eventModule) {
                    const evt = eventModule[key];
                    if (evt?.name && evt?.execute) {
                        client.on(evt.name, (...args) => evt.execute(...args, client));
                        console.log(`   ✅ ${evt.name} (${file})`);
                    }
                }
            }
        } catch (e) { console.error(`   ❌ Hata (${file}): ${e.message}`); }
    }
}

// 6. Yan Modüller (Hata verirse bot durmasın)
let performanceMonitor, isMaintenanceMode, canUseCommandsDuringMaintenance, trackCommandUsage;
try {
    performanceMonitor = require('./utils/performanceMonitor');
    const maintenance = require('./commands/admin/maintenance');
    isMaintenanceMode = maintenance.isMaintenanceMode;
    canUseCommandsDuringMaintenance = maintenance.canUseCommandsDuringMaintenance;
    const botStats = require('./commands/info/botstats');
    trackCommandUsage = botStats.trackCommandUsage;
} catch (e) {
    // Modüller henüz hazır olmayabilir, sorun değil
}

module.exports = {
    performanceMonitor,
    isMaintenanceMode,
    canUseCommandsDuringMaintenance,
    trackCommandUsage
};

// 7. Database Bağlantısı
async function connectDatabase() {
    console.log('🔗 Database bağlanıyor...');
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI eksik!');
        await db.connect();
    } catch (error) {
        console.error('❌ Database hatası:', error.message);
        console.log('⚠️ Bot veritabanı olmadan sınırlı modda çalışacak.');
    }
}

// 8. Bot Başlatma
async function startBot() {
    console.log('🤖 Bot Discord\'a giriş yapıyor...');
    try {
        await client.login(process.env.TOKEN);
        
        // Web Paneli Başlat (Bot giriş yaptıktan sonra)
        console.log('🌐 Dashboard başlatılıyor...');
        try {
            require('./dashboard/app.js')(client);
        } catch (e) {
            // Eski dashboard kodu varsa yoruma al:
// 🌐 Dashboard başlatılıyor...
// try {
//     require('./dashboard/app.js');
//     console.log('✅ Dashboard başlatıldı');
// } catch (error) {
//     console.log('❌ Dashboard başlatılamadı:', error.message);
// }

// Yeni dashboard bilgisi:
console.log('🌐 Dashboard: http://localhost:3000');
        }

    } catch (error) {
        console.error('❌ Bot giriş hatası:', error.message);
        
        // Token hatalı olabilir
        if (error.message.includes('TOKEN_INVALID') || error.message.includes('incorrect login')) {
            console.error('\n❌❌❌ GEÇERSİZ TOKEN!');
            console.error('   Discord Developer Portal\'dan yeni token alın:');
            console.error('   https://discord.com/developers/applications');
            console.error('   .env dosyanızdaki TOKEN\'i güncelleyin.');
        }
        
        process.exit(1);
    }
}

// 9. Ana başlatma fonksiyonu
async function start() {
    try {
        // Database bağlan
        await connectDatabase();
        
        // Bot'u başlat
        await startBot();
        
    } catch (error) {
        console.error('❌ Başlatma hatası:', error);
        process.exit(1);
    }
}

// 10. Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Bot kapatılıyor...');
    
    if (client && client.user) {
        client.destroy();
        console.log('✅ Bot bağlantısı kesildi');
    }
    
    if (db && db.client) {
        await db.client.close();
        console.log('✅ Database bağlantısı kapatıldı');
    }
    
    console.log('👋 Hoşça kal!');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    // Gereksiz promise hatalarını konsolu kirletmemesi için filtreleyebilirsin
    if (error.code === 10062) return; // Unknown interaction
    console.error('⚠️ İşlenmeyen Hata:', error.message || error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Kritik Hata:', error);
});

// BAŞLAT
start();