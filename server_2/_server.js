let User = require('./db/user');
let db = require('./db/index');
let ws = require('ws');
let msgpack = require('msgpack-lite');
let crypto = require('crypto');
let wss = new ws.Server({ port: 8080 });
// packets from client to server
let allowedPackets = [
    'u', // update user data ['u', <display name>]
    'init', // initialize user data  ['init', discordId, displayName]
    'po', // ping response
];
// const Discord = require('discord.js');
// const client = new Discord.Client();


let clients = [];

// create a function thats going to send 'au' and the list of all users to each client
let sendUserDataToClient = async ws => {
    try {
        let users = await User.find();

        // could use the following code, but i prefer to for-loops for the sake of performance
        // let usersData = users.map(user => [user.discordId, user.displayName, user.badges]);
        let userData = [];
        for (let i = 0; i < users.length; i++) {
            userData.push([users[i].discordId, users[i].displayName, users[i].badges]);
        }

        ws.send(msgpack.encode(['au', ...userData]));
    } catch (error) {
        console.error(error);
    }
};

let updateUserForAllClients = async (updateDataBase, { discordId, displayName, badges }) => {
    try {
        if (!discordId || !displayName) return console.error(new Error('Missing discordId or displayName'));

        if (updateDataBase) {
            let user = await User.findOne({ discordId });
            if (!user) return console.error(new Error("User does'nt exist")); // you can handle this case later

            user.displayName = displayName || user.displayName;
            user.badges = badges || user.badges;

            await user.save();
        }

        // send the updated user data to all clients
        for (let i = 0; i < clients.length; i++) clients[i].send(msgpack.encode(['u', discordId, displayName, badges]));
    } catch (error) {
        console.error(error);
    }
};


wss.on('connection', ws => {
    let send = (arg, ...data) => ws.send(msgpack.encode([arg, ...data]));
    clients.push(ws);

    sendUserDataToClient(ws);

    ws.on('close', () => {
        clients.splice(clients.indexOf(ws), 1);
    });

    // send a crypto generated random seed to the client
    ws.secretSeed = crypto.randomBytes(32).toString('hex');

    send('init', ws.secretSeed, [
        {
            n: 'dev',
            id: '1901283908812'
        },
        {
            n: 'bug_hunter',
            id: '0293409238404'
        },
        {
            n: 'cc',
            id: '9238747283478'
        },
        {
            n: 'css_maker',
            id: '2093874987234'
        },
        {
            n: 'dev',
            id: '9234870923498',
        },
        {
            n: 'early_supporter',
            id: '2308942089340'
        },
        {
            n: 'partner',
            id: '2938402803409',
        },
        {
            n: 'qt',
            id: '0293840923489',
        },
        {
            n: 'vip',
            id: '2093840923840',
        }
    ]);



    ws.on('message', data => {
        const packet = msgpack.decode(data);
        let key = packet[0];
        let args = packet.slice(1);

        if (!allowedPackets.includes(key)) return console.error(new Error(`Invalid packet received: ${key}`));

        switch (key) {
            case 'u':
                User.findOneAndUpdate({ discordId: ws.discordId }, { displayName: args[0] }, { upsert: true }).catch(console.error);
                updateUserForAllClients(true, { discordId: ws.discordId, displayName: args[0] });
                break;

            case 'init':
                ws.discordId = args[0];
                if (args[1] === undefined || args[1] === null || args[1] === '') return console.error(new Error('Missing displayName'))
                User.findOneAndUpdate({ discordId: ws.discordId }, { displayName: args[1] }, { upsert: true }).catch(console.error);
                break;

        }
    });
});

