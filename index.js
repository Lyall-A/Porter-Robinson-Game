const ws = require("ws");

let serverId;
let id;

const pos = [70, 5, 1.629];
const rot = [0, -0.707, 0, 0.707];
const location = "https://github.com/Lyall-A/Porter-Robinson-Game :DDDD";
const maxInRoom = 10;
const nextResetAllowed = 15 * 1000;
const track = 2; // 0: cheerleader, 1: porter, 2: cat

// fun stuff
const circle = { centerX: 55, centerZ: 0, radius: 5, angle: 0, steps: 20 }; // run in circles
// const circle = false;
// const circleFollow = true; // use circle, but centerX and centerY is of other players
const circleFollow = false;
// const follow = { offsetPos1: 1.5 }; // follow players
const follow = false; // follow players

start();

function start() {
    const url = "wss://s.dreamwave.network/arptree/ws";
    const socket = connectWS(url);

    socket.on("open", () => {
        connectDate = Date.now();
        console.log(`WebSocket connected to '${url}'`);

        // handshake probably
        socket.sendJson({
            coords: [0, 0],
            type: "community_arptreeend",
            _evt: "findAny"
        });

        // send alive
        socket.whileConnected(() => {
            socket.sendJson({
                _evt: "alive"
            });
        }, 4 * 1000);

        // send pings
        socket.whileConnected(() => {
            socket.sendText("ping");
        }, 5 * 1000);

        // movement packet
        socket.whileConnected(() => {
            if (circle) {
                pos[0] = circle.centerX + circle.radius * Math.cos(circle.angle);
                pos[2] = circle.centerZ + circle.radius * Math.sin(circle.angle);
                circle.angle += Math.PI / circle.steps;
                if (circle.angle >= Math.PI * 2) circle.angle = 0;
            }
            sendBinary([], {
                character: {
                    p: pos,
                    q: rot
                }
            });
        }, 50);

        // sets nra (next reset allowed time) and triggers a annoying reset thing, sorry
        const height = 48;
        const width = 12;
        const char = "skibidi toilet fan club!!! ";
        // const height = 48;
        // const width = 33;
        // const char = "smile!!!! ";
        socket.whileConnected(() => sendBinary([
            {
                evtData: {
                    time: nextResetAllowed
                },
                evtName: "nra",
                id: "this is required, but can be anything lmao"

            },
            {
                evtData: { by: new Array(height).fill(char.repeat(width)).join("\n") },
                // evtData: { by: location },
                evtName: "physics_reset_scene"
            }
        ]), 500);
    });

    // packets: [{"pS":"d","events":[],"objects":{"character":{"p":[89.26,2.657,-0.757],"q":[0,-0.707,0,0.707]}},"global":{},"from":"173219933823072-4ed-806-dc4"},{"events":[],"from":"173219927996962-47b-a2e-d57","global":{},"objects":{"character":{"p":[50,5,6.123233995736766e-16],"q":[0,-0.707,0,0.707]}},"pS":"d"}]
    socket.on("packet", packets => {
        for (const packet of packets) {
            // console.log(`${item.from} is at position: ${item.objects.character.p[0]}, ${item.objects.character.p[1]}, ${item.objects.character.p[2]}, rotation: ${item.objects.character.q[0]}, ${item.objects.character.q[1]}, ${item.objects.character.q[2]}, ${item.objects.character.q[3]}`);
            
            for (const event of packet.events) {
                if (event.evtName === "physics_reset_scene") {
                    // console.log(`Received reset from ${item.from} in ${event.evtData.by}`);
                } else
                    if (event.evtName === "nra") {
                        // console.log(`Next reset allowed time is ${event.evtData.time}`);
                    } else {
                        console.log(`Unkown event '${event.evtName}':`, event.evtData);
                    }
            };

            if (packet.from !== id) {
                if (circleFollow) {
                    circle.centerX = packet.objects.character.p[0];
                    pos[1] = packet.objects.character.p[1] + (follow.offsetPos1 || 0);
                    circle.centerZ = packet.objects.character.p[2];
                    rot[0] = packet.objects.character.q[0] + (follow.offsetRot0 || 0);
                    rot[1] = packet.objects.character.q[1] + (follow.offsetRot1 || 0);
                    rot[2] = packet.objects.character.q[2] + (follow.offsetRot2 || 0);
                    rot[3] = packet.objects.character.q[3] + (follow.offsetRot3 || 0);
                } else
                    if (follow) {
                        pos[0] = packet.objects.character.p[0] + (follow.offsetPos0 || 0);
                        pos[1] = packet.objects.character.p[1] + (follow.offsetPos1 || 0);
                        pos[2] = packet.objects.character.p[2] + (follow.offsetPos2 || 0);
                        rot[0] = packet.objects.character.q[0] + (follow.offsetRot0 || 0);
                        rot[1] = packet.objects.character.q[1] + (follow.offsetRot1 || 0);
                        rot[2] = packet.objects.character.q[2] + (follow.offsetRot2 || 0);
                        rot[3] = packet.objects.character.q[3] + (follow.offsetRot3 || 0);
                    }
            }
            if (packet.from === id && !circleFollow && !follow) {
                pos[0] = packet.objects.character.p[0];
                pos[1] = packet.objects.character.p[1];
                pos[2] = packet.objects.character.p[2];
                rot[0] = packet.objects.character.q[0];
                rot[1] = packet.objects.character.q[1];
                rot[2] = packet.objects.character.q[2];
                rot[3] = packet.objects.character.q[3];
            }
        }
    });

    // event: {"success":true,"host":false,"players":[{"id":"173219927996962-47b-a2e-d57","data":{"down":false,"track":2,"location":"https://github.com/Lyall-A/Porter-Robinson-Game :DDDD"}},{"id":"173219933823072-4ed-806-dc4","data":{"down":false,"track":2,"location":"United Kingdom"}}],"myID":"173219933823072-4ed-806-dc4","serverId":"173147105039536-4a0-8e1-ac4","_evt":"join_response","_id":"82281d6-a10"}
    socket.on("event", event => {
        const name = event._evt;
        // console.log(`Received event: ${name}`);
        if (name === "findAny_response") {
            serverId = event.id;
            console.log(`Received findAny response, Server ID: ${serverId}`);
            socket.sendJson({
                id: serverId,
                user: {
                    down: false, // ???
                    track,
                    location
                },
                MAX_IN_ROOM: maxInRoom,
                _evt: "join"
            })
        } else
            if (name === "join_response") {
                id = event.myID;
                console.log(`Received join response: ${event.success ? "success!" : "failure :("}`);
                console.log(`Host (what does this do?): ${event.host ? "yes :)" : "no :("}`);
                console.log(`ID: ${id}`);
                console.log(`Players (${event.players.length}): ${event.players.map(i => `${i.id}${i.id === id ? " (me)" : ""} from ${i.data.location}`).join(", ")}`);
                // socket.sendJson({ _evt: "request_state" }); // returns a pin and rebroadcast_players event
            } else
                // fuck you formatter
                if (name === "become_host") {
                    console.log("Now host :D");
                } else
                    if (name === "player_disconnect") {
                        console.log(`Player ${event.gcID} disconnected`);
                    } else
                        if (name === "open_connection") {
                            console.log(`Player ${event.gcID} connected from ${event.data.location}`);
                        } else
                            if (name === "update_user_data") {

                            }
                            else {
                                console.log(`Unknown event '${name}':`, event);
                            }
    });

    socket.on("close", () => {
        console.log(`WebSocket disconnected, reconnecting in 1 second...`);
        setTimeout(start, 1 * 1000);
    });


    function sendBinary(events = [], objects = {}) {
        socket.sendText(`binary:${JSON.stringify({
            events,
            from: id,
            global: {},
            objects,
            pS: "d"
        })}`);
    }
}

function connectWS(url) {
    const webSocket = {};
    const listeners = [];
    const intervals = [];
    const socket = new ws.WebSocket(url);

    webSocket.listeners = listeners;
    webSocket.socket = socket;

    webSocket.sendJson = json => socket.send(JSON.stringify(json));
    webSocket.sendText = text => socket.send(text);
    webSocket.whileConnected = (callback, interval) => intervals.push(setInterval(callback, interval));
    webSocket.call = (name, ...values) => {
        for (const listenerIndex in [...listeners]) {
            const listener = listeners[listenerIndex];
            if (listener.name === name) listener.callback(...values);
            if (listener.once) listeners.splice(listenerIndex, 1);
        }
    }
    webSocket.on = (name, callback) => listeners.push({ name, callback, once: false });
    webSocket.once = (name, callback) => listeners.push({ name, callback, once: true });

    socket.on("open", () => {
        webSocket.call("open");
    });
    socket.on("message", msg => {
        const text = msg.toString();
        try {
            const json = JSON.parse(text);
            webSocket.call("json", json);
            if (json._evt) webSocket.call("event", json);
            if (json instanceof Array) webSocket.call("packet", json);
        } catch (err) {
            webSocket.call("text", text);
        }
        if (text === "pong") webSocket.call("pong");
    });
    socket.on("close", () => {
        webSocket.call("close");
    });

    return webSocket;
}
