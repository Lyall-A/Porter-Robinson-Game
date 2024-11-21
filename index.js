const ws = require("ws");

let connectDate;
let serverId;
let id;

// const pos = [80, 2.64, 2];
// const pos = [88.261, 2.699, 1.629];
const pos = [70, 5, 1.629];
const rot = [0, -0.707, 0, 0.707];
const location = "https://github.com/Lyall-A/Porter-Robinson-Game :DDDD";
// const location = "\n\n\n\n\n\n\nSKIBIDI TOILET IS THE FUCKING BEST!!!!!!!";
const maxInRoom = 10;
const track = 1; // 0: cheerleader, 1: porter, 2: cat

// fun stuff
// const circle = { centerX: 55, centerZ: 0, radius: 3, angle: 0, steps: 6 }; // run in circles
const circle = false;
// const circleFollow = true; // use circle, but centerX and centerY is of other players
const circleFollow = false;
// const follow = { offsetPos1: 1.5 }; // follow players
const follow = false; // follow players

let socket;

socket = connectWS("wss://s.dreamwave.network/arptree/ws", true, (url) => {
    connectDate = Date.now();
    console.log(`WebSocket connected to '${url}'`);
    socket.json({
        coords: [0, 0],
        type: "community_arptreeend",
        _evt: "findAny"
    });
    setInterval(() => {
        socket.json({
            _evt: "alive"
        });
    }, 4 * 1000);
    setInterval(() => {
        socket.send("ping");
    }, 5 * 1000);
    setInterval(() => {
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

    // lol
    const height = 48;
    const width = 12;
    const char = "skibidi toilet fan club!!! ";
    // const height = 40;
    // const width = 2;
    // const char = `*!$(^*%!($*%*^(*"$)()*^)%!*^)$(%)$\\|||"!()%)()!)(%$%$%&$&T%*"&(*$%^T%__++_!"$%^&*()><?>?.';'.,//\||||\\?%"$?%"?!"?!?!"%$%()$\`\`\`\`okrjieroijijij3iojio\`joi\`jioj)(we\``;
    // MAKES THE GAME UNUSABLE? WHAT
    setInterval(() => sendBinary([
        {
            evtData: {
                time: 0
            },
            evtName: "nra",
            id: "useless thing lmao"

        },
        {
            evtData: { by: new Array(height).fill(char.repeat(width)).join("\n") },
            evtName: "physics_reset_scene"
        }
    ]), 500);
}, (json, rawMsg) => {
    // if (rawMsg.toString() === "pong") return console.log(`Received pong`);
    if (!json) return;
    // console.log(json);

    if (json instanceof Array) {
        for (const item of json) {
            // console.log(`${item.from} is at position: ${item.objects.character.p[0]}, ${item.objects.character.p[1]}, ${item.objects.character.p[2]}, rotation: ${item.objects.character.q[0]}, ${item.objects.character.q[1]}, ${item.objects.character.q[2]}, ${item.objects.character.q[3]}`);
            item.events.forEach(event => {
                if (event.evtName === "physics_reset_scene") {
                    // console.log(`Received reset from ${item.from} in ${event.evtData.by}`);
                } else
                    if (event.evtName === "nra") {
                        console.log(`Next reset allowed time is ${event.evtData.time}`);
                    } else {
                        console.log(`Unkown event '${event.evtName}':`, event.evtData);
                    }
            });
            if (item.from !== id) {
                if (circleFollow) {
                    circle.centerX = item.objects.character.p[0];
                    pos[1] = item.objects.character.p[1] + (follow.offsetPos1 || 0);
                    circle.centerZ = item.objects.character.p[2];
                    rot[0] = item.objects.character.q[0] + (follow.offsetRot0 || 0);
                    rot[1] = item.objects.character.q[1] + (follow.offsetRot1 || 0);
                    rot[2] = item.objects.character.q[2] + (follow.offsetRot2 || 0);
                    rot[3] = item.objects.character.q[3] + (follow.offsetRot3 || 0);
                } else
                    if (follow) {
                        pos[0] = item.objects.character.p[0] + (follow.offsetPos0 || 0);
                        pos[1] = item.objects.character.p[1] + (follow.offsetPos1 || 0);
                        pos[2] = item.objects.character.p[2] + (follow.offsetPos2 || 0);
                        rot[0] = item.objects.character.q[0] + (follow.offsetRot0 || 0);
                        rot[1] = item.objects.character.q[1] + (follow.offsetRot1 || 0);
                        rot[2] = item.objects.character.q[2] + (follow.offsetRot2 || 0);
                        rot[3] = item.objects.character.q[3] + (follow.offsetRot3 || 0);
                    }
            }
            if (item.from === id && !circleFollow && !follow) {
                pos[0] = item.objects.character.p[0];
                pos[1] = item.objects.character.p[1];
                pos[2] = item.objects.character.p[2];
                rot[0] = item.objects.character.q[0];
                rot[1] = item.objects.character.q[1];
                rot[2] = item.objects.character.q[2];
                rot[3] = item.objects.character.q[3];
            }
        }
    } else {
        const event = json._evt;

        if (event) {
            // console.log(`Received event: ${event}`);
            if (event === "findAny_response") {
                serverId = json.id;
                console.log(`Received findAny response, Server ID: ${serverId}`);
                socket.json({
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
                if (event === "join_response") {
                    id = json.myID;
                    console.log(`Received join response, ${json.success ? "success!" : "failure :(,"} host: ${json.host ? "yes" : "no"}, ID: ${id}, players: ${json.players.map(i => `${i.id} from ${i.data.location}`).join(", ")}`);
                    // socket.json({ _evt: "request_state" });
                } else
                    if (event === "become_host") {
                        console.log("Became host");
                    } else
                        if (event === "player_disconnect") {
                            console.log(`Player ${json.gcID} disconnected`);
                        } else
                            if (event === "open_connection") {
                                console.log(`Player ${json.gcID} connected from ${json.data.location}`);
                            } else
                                if (event === "update_user_data") {

                                }
                                else {
                                    console.log(`Unknown event '${event}':`, json);
                                }
        }
    }
});

function sendBinary(events = [], objects = {}) {
    socket.send(`binary:${JSON.stringify({
        events,
        from: id,
        global: {},
        objects,
        pS: "d"
    })}`);
}

function connectWS(url, json, connectCallback, messageCallback) {
    const socket = new ws.WebSocket(url);
    socket.json = json => socket.send(JSON.stringify(json));
    socket.on("open", () => {
        connectCallback(url);
    });
    socket.on("message", msg => {
        const string = msg.toString();
        if (json) {
            try {
                const msgJson = JSON.parse(string);
                messageCallback(msgJson, msg);
            } catch (err) {
                messageCallback(null, msg);
            }
        } else {
            messageCallback(string, msg);
        }
    });
    return socket;
}
