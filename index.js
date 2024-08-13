const USERNAME = process.argv[2];
if (!USERNAME) {
    console.error('pls provide an username');
    process.exit(1);
}

let USERID;
let userPresence;
let favoriteList = new Map();
let badgesGamesList = new Map();
let gameId;
let found = false;

const BASE_URL = 'https://api.roblox.com';
const sleep = (time) => new Promise((res) => setTimeout(res, time * 1000));

const get = async (url, includeCreds = false) => {
    try {
        const creds = includeCreds ? 'include' : 'omit';
        const response = await fetch(url, { credentials: creds });
        if (!response.ok) throw new Error('Request failed');
        return await response.json();
    } catch (error) {
        await sleep(0.2);
        return await get(url, includeCreds);
    }
};

const post = async (url, body) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Request failed');
        return await response.json();
    } catch (error) {
        await sleep(0.2);
        return await post(url, body);
    }
};

async function defineId() {
    const response = await post('https://users.roblox.com/v1/usernames/users', JSON.stringify({ usernames: [USERNAME] }));
    USERID = response.data[0].id;
}

async function isConnected() {
    const url = 'https://presence.roblox.com/v1/presence/users';
    const requestData = { userIds: [USERID] };
    const response = await post(url, JSON.stringify(requestData));
    userPresence = response.userPresences[0]?.userPresenceType;
}

async function fetchAllData(url, params = {}) {
    let cursor = '';
    let results = [];
    do {
        const requestUrl = new URL(url);
        Object.entries(params).forEach(([key, value]) => requestUrl.searchParams.append(key, value));
        if (cursor) requestUrl.searchParams.append('cursor', cursor);

        const response = await get(requestUrl.toString());
        results = results.concat(response.data || response.Data?.Items || []);
        cursor = response.nextPageCursor || response.Data?.NextCursor || null;
    } while (cursor);
    return results;
}

async function makeBadgesList() {
    const results = await fetchAllData(`https://badges.roblox.com/v1/users/${USERID}/badges`);
    results.forEach(item => badgesGamesList.set(item.awarder.id, ""));
}

async function checkServers() {
    let userImage;
    let allPlayers = [];
    let playersCount = 0;
    let playersChecked = 0;
    let targetServerIds = [];

    async function fetchServers(cursor = '', attempts = 0) {
        if (cursor === '') {
            const url = `https://games.roblox.com/v1/games/${gameId}/servers/Public?limit=100`;
        }
        else {
            const url = `https://games.roblox.com/v1/games/${gameId}/servers/Public?limit=100&cursor=${cursor}`;
        }
        const response = await get(url);

        if (attempts >= 30 || !response.data.length) return;

        response.data.forEach(server => {
            if (!targetServerIds.includes(server.id)) {
                server.playerTokens.forEach(playerToken => {
                    targetServerIds.push(server.id);
                    playersCount += 1;
                    allPlayers.push({
                        token: playerToken,
                        type: 'AvatarHeadshot',
                        size: '150x150',
                        requestId: server.id
                    });
                });
            }
        });

        if (response.nextPageCursor) await fetchServers(response.nextPageCursor, attempts + 1);
    }

    async function findTarget() {
        while (!found) {
            const chosenPlayers = allPlayers.splice(0, 100);

            if (!chosenPlayers.length) {
                await sleep(0.1);
                if (playersChecked === playersCount) break;
                continue;
            }

            const response = await post('https://thumbnails.roblox.com/v1/batch', JSON.stringify(chosenPlayers));
            for (const thumbnailData of response.data) {
                playersChecked += 1;
                if (thumbnailData.imageUrl === userImage) {
                    console.log(`${USERNAME} is playing https://www.roblox.com/games/${gameId}`);
                    found = true;
                    return;
                }
            }
        }
    }

    async function updateUser() {
        const response = await get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${USERID}&size=150x150&format=Png&isCircular=false`);
        userImage = response.data[0]?.imageUrl;
    }

    await updateUser();
    await fetchServers();
    await findTarget();
}

async function main() {
    await defineId();
    await isConnected();

    if (userPresence === 0) {
        console.log("the user is not connected");
        return;
    }
    if (userPresence === 1) {
        console.log("the user is connected but not playing");
        return;
    }
    console.log("the user is playing");

    console.log("indexing badge list...");
    await makeBadgesList();
    const reversedMap = new Map([...badgesGamesList.entries()].reverse());

    let index = 1;
    const badgesCount = reversedMap.size;
    console.log(`${badgesCount} games found on badge list, testing...`);
    for (const key of reversedMap.keys()) {
        gameId = key;
        await checkServers();
        if (found) break;
        console.log(`${index++}/${badgesCount} checked`);
    }
}

main();
