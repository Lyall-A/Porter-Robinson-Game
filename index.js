const ws = require("ws");

let connectDate;
let serverId;
let id;

// const pos = [80, 2.64, 2];
const pos = [80, 4, 2];
const rot = [0, -0.7, 0, 0.5];
const location = "United Kingdom";
const maxInRoom = 10;
const track = 1; // 0: idk, 1: knock yourself out, 2: cat

const circle = { centerX: 55, centerZ: 0, radius: 5, angle: 0, steps: 10 }; // run in circles
// const circle = false; // run in circles

connectWS("wss://s.dreamwave.network/arptree/ws", true, (url, socket) => {
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
        // pos[1] += 0.03;
        socket.send(`binary:${JSON.stringify({
                events: [],
                from: id,
                global: {},
                objects: {
                    character: {
                        p: pos,
                        q: rot
                    }
                },
                pS: "d"
        })}`);
    }, 100);
}, (json, socket, rawMsg) => {
    // if (rawMsg.toString() === "pong") return console.log(`Received pong`);
    if (!json) return;
    // console.log(json);

    if (json instanceof Array) {
        for (const item of json) {
            // console.log(`${item.from} is at position: ${item.objects.character.p[0]}, ${item.objects.character.p[1]}, ${item.objects.character.p[2]}, rotation: ${item.objects.character.q[0]}, ${item.objects.character.q[1]}, ${item.objects.character.q[2]}, ${item.objects.character.q[3]}`);
        }
        return;
    }

    const event = json._evt;

    if (event) {
        console.log(`Received event: ${event}`);
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
            console.log(`Received join response, ${json.success ? "success!" : "failure :("}, host: ${json.host ? "yes" : "no"}, ID: ${id}, players: ${json.players.map(i => `${i.id} from ${i.data.location}`).join(", ")}`);
            // socket.json({ _evt: "request_state" });
        } else
        if (event === "become_host") {
            console.log("Became host");
        } else
        if (event === "player_disconnect") {
            console.log(`Player ${json.gcID} disconnectd`);
        }
        else {
            console.log(`Unknown event '${event}':`, json);
        }
    }
});

function connectWS(url, json, connectCallback, messageCallback) {
    const socket = new ws.WebSocket(url);
    socket.json = json => socket.send(JSON.stringify(json));
    socket.on("open", () => {
        connectCallback(url, socket);
    });
    socket.on("message", msg => {
        const string = msg.toString();
        if (json) {
            try {
                const msgJson = JSON.parse(string);
                messageCallback(msgJson, socket, msg);
            } catch (err) {
                messageCallback(null, socket, msg);
            }
        } else {
            messageCallback(string, socket, msg);
        }
    });
}