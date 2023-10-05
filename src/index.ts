#!/usr/bin/env node

import { botConfig, XmtpBot, IContext } from "xmtp-bot-cli";
import { DecodedMessage, Conversation } from "@xmtp/xmtp-js";
import { verify } from "./sismo";
import { getPosts, createPost, getProfiles, createProfile, updateProfile, getProfileBynickname, getProfileByXmtp } from "./db";
import { HOXStatusCode, HOXResponse, HOXRequest, parseHOXRequest } from "./hox";
import { SismoConnectResponse } from "@sismo-core/sismo-connect-server";
const COPY_SENDER = true;

const connections = new Map<string, boolean>();
// XXX can't pickle-store in db
const convos = new Map<string, Conversation>();
let topic = 'Set a topic with /topic <topic>';

if (process.env.PRC_XMTP_ENV !== undefined) {
    botConfig.env = process.env.PRC_XMTP_ENV as typeof botConfig.env;
}
if (process.env.PRC_XMTP_KEY !== undefined) {
    botConfig.key = process.env.PRC_XMTP_KEY as typeof botConfig.key;
}

async function handleCommand(ctx: IContext, line: string) {
    if (line === '/exit') {
        return false;
    }
    console.log('Invalid command.');
    return true;
}

async function handleMessage(ctx: IContext, message: DecodedMessage) {
    if (ctx.client !== undefined && message.senderAddress === ctx.client.address) {
        return true;
    }

    console.log(`Incoming message`, message.content, 'from', message.senderAddress);
    const senderAddress = message.senderAddress;
    const profile = await getProfileByXmtp(senderAddress);
    if (message.content === 'GET /ping' || (message.content === '/ping' && connections.get(senderAddress) === true)) {
        if (!profile) {
            await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized));
            return true;
        }
        if (connections.get(senderAddress) === true) {
            await message.conversation.send(new HOXResponse(HOXStatusCode.OK, 'PONG'));
        } else {
            await message.conversation.send(new HOXResponse(HOXStatusCode.NoPong));
        }
        return true;
    }

    if (connections.get(senderAddress) === true) {
        if (message.content === 'DELETE .' || message.content === '/close') {
            connections.set(senderAddress, false);
            convos.delete(senderAddress);
            await message.conversation.send(new HOXResponse(HOXStatusCode.OK, 'Connection closed'));
            return true;
        } else if (message.content.split(' ')[0] === '/topic') {
            if (message.content.split(' ').length == 1) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.OK, topic));
            } else {
                topic = message.content.split('\n')[0].replace(/^\/topic /, '');
                await message.conversation.send(new HOXResponse(HOXStatusCode.Created, 'Set topic: ' + topic)); 
            }
            return true;
        }
        for (const [address, connected] of connections) {
            if (connected === true) {
                if (address !== senderAddress || COPY_SENDER) {
                    await convos.get(address)?.send(`<${senderAddress}> ${message.content}`);
                }
            }
        }
        return true;
    }

    let hoxreq: HOXRequest;
    try {
        hoxreq = parseHOXRequest(message.content);
    } catch (err) {
        console.log('parseXRequest failed', err);
        await message.conversation.send(new HOXResponse(HOXStatusCode.BadRequest));
        return true;
    }
    console.log('hoxreq.method ===', hoxreq.method);
    console.log('hoxreq.path ===', hoxreq.path);
    if (hoxreq.method === 'CONNECT') {
        // TODO path is channel
        if (!profile) {
            await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized));
            return true;
        }
        connections.set(senderAddress, true);
        convos.set(senderAddress, message.conversation);
        await message.conversation.send(new HOXResponse(HOXStatusCode.OK, 'Connected successfully'));
    } else if (hoxreq.method === 'GET') {
        if (hoxreq.path === '/posts') {
            if (!profile) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized));
                return true;
            }
            const posts = await getPosts();
            await message.conversation.send(new HOXResponse(HOXStatusCode.OK, JSON.stringify(posts)));
        } else if (hoxreq.path === '/profile') {
            if (!profile) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized));
                return true;
            }
            if (hoxreq.parameters && hoxreq.parameters.nickname) {
                const nickname = hoxreq.parameters.nickname;
                const profile = await getProfileBynickname(nickname);
                await message.conversation.send(new HOXResponse(HOXStatusCode.OK, JSON.stringify(profile)));
            } else {
                await message.conversation.send(new HOXResponse(HOXStatusCode.BadRequest, 'nickname is missing'));
            }
        } else if (hoxreq.path === '/topic') {
            await message.conversation.send(new HOXResponse(HOXStatusCode.OK, topic));
        } else if (hoxreq.path === '/debug') {
            console.log(await getProfiles());
            console.log(await getPosts());
        } else {
            await message.conversation.send(new HOXResponse(HOXStatusCode.NotFound));
        }
    } else if (hoxreq.method === 'POST') {
        if (hoxreq.path === '/auth') {
            const sismoResponse: SismoConnectResponse = JSON.parse(hoxreq.body);
            try {
                await verify(sismoResponse);

                const auth0userIds = sismoResponse.proofs.map(
                    (proof) => (proof.auths ?
                        proof.auths.filter((auth) => auth.authType === 0)
                            .map((auth) => auth.userId || '') :
                        [])
                );
                const userIds: string[] = ([] as string[]).concat(...auth0userIds);
                if (userIds.length === 0) {
                    throw new Error('No userIds found');
                } else if (userIds.length > 1) {
                    throw new Error('More than one userId found');
                }

                if (profile) {
                    if (profile.user_id !== userIds[0]) {
                        throw new Error('User ID mismatch');
                    }
                } else {
                    const nickname = hoxreq.parameters.nickname || '';
                    if (nickname === '') {
                        throw new Error('nickname is missing');
                    }
                    await createProfile(nickname, userIds[0], senderAddress);
                }
                await message.conversation.send(new HOXResponse(HOXStatusCode.OK, 'Authentication successful'));
            } catch (error) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized, 'Authentication failed'));
                return true;
            }
        } else if (hoxreq.path === '/posts') {
            if (!profile) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.Unauthorized, 'Unauthorized'));
                return true;
            }
            try {
                await createPost(profile.nickname, profile.user_id, hoxreq.body);
                await message.conversation.send(new HOXResponse(HOXStatusCode.Created, 'Post created successfully'));
            } catch (error) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.BadRequest, 'Failed to create a new post'));
            }
        } else if (hoxreq.path === '/profile') {
            profile.nickname = JSON.parse(hoxreq.body).nickname;
            try {
                await updateProfile(profile);
                await message.conversation.send(new HOXResponse(HOXStatusCode.Created, 'Profile updated successfully'));
            } catch (error) {
                await message.conversation.send(new HOXResponse(HOXStatusCode.BadRequest, 'Failed to update the profile'));
            }
        } else if (hoxreq.path === '/topic') {
            topic = hoxreq.body.split('\n')[0];
            await message.conversation.send(new HOXResponse(HOXStatusCode.Created, 'Set topic: ' + topic));
        } else {
            await message.conversation.send(new HOXResponse(HOXStatusCode.NotFound));
        }
    }

    return true;
}

console.log('Starting bot.');
const bot = new XmtpBot(
    handleCommand,
    handleMessage,
);

bot.run().then(() => {
    process.exit(0);
}).catch((err) => {
    1769816
    console.error(`bot.run() error: ${err}`);
    process.exit(1);
});
