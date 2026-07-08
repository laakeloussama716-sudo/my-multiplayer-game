import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = 3000;
const WORLD_SIZE = 4000;

// Exact obstacles matching client layout for precise server-side collision
const serverObstacles = [
  { 
    id: "house_alpha", x: 500, y: 500, w: 260, h: 260,
    door: { x: 580, y: 760, w: 90, h: 16 },
    walls: [
      {x: 500, y: 500, w: 260, h: 20}, {x: 500, y: 500, w: 20, h: 260},
      {x: 740, y: 500, w: 20, h: 260}, {x: 500, y: 740, w: 80, h: 20}, {x: 670, y: 740, w: 80, h: 20}
    ] 
  },
  { 
    id: "house_bravo", x: 2200, y: 900, w: 320, h: 220,
    door: { x: 2320, y: 1120, w: 90, h: 16 },
    walls: [
      {x: 2200, y: 900, w: 320, h: 20}, {x: 2200, y: 900, w: 20, h: 220},
      {x: 2500, y: 900, w: 20, h: 220}, {x: 2200, y: 1100, w: 120, h: 20}, {x: 2410, y: 1100, w: 110, h: 20}
    ] 
  },
  { 
    id: "house_charlie", x: 1400, y: 2500, w: 220, h: 320,
    door: { x: 1400, y: 2620, w: 16, h: 80 },
    walls: [
      {x: 1400, y: 2500, w: 220, h: 20}, {x: 1400, y: 2800, w: 220, h: 20},
      {x: 1600, y: 2500, w: 20, h: 320}, {x: 1400, y: 2500, w: 20, h: 120}, {x: 1400, y: 2700, w: 20, h: 120}
    ] 
  },
  { 
    id: "house_delta", x: 3100, y: 400, w: 240, h: 240,
    door: { x: 3190, y: 400, w: 70, h: 16 },
    walls: [
      {x: 3100, y: 400, w: 90, h: 20}, {x: 3260, y: 400, w: 80, h: 20},
      {x: 3100, y: 400, w: 20, h: 240}, {x: 3320, y: 400, w: 20, h: 240}, {x: 3100, y: 620, w: 240, h: 20}
    ] 
  },
  { 
    id: "house_echo", x: 800, y: 1600, w: 360, h: 200,
    door: { x: 1160, y: 1660, w: 16, h: 70 },
    walls: [
      {x: 800, y: 1600, w: 360, h: 20}, {x: 800, y: 1780, w: 360, h: 20},
      {x: 800, y: 1600, w: 20, h: 200}, {x: 1140, y: 1600, w: 20, h: 60}, {x: 1140, y: 1730, w: 20, h: 70}
    ] 
  },
  { 
    id: "house_foxtrot", x: 2500, y: 2900, w: 200, h: 200,
    door: { x: 2500, y: 2960, w: 16, h: 60 },
    walls: [
      {x: 2500, y: 2900, w: 200, h: 20}, {x: 2500, y: 3080, w: 200, h: 20},
      {x: 2680, y: 2900, w: 20, h: 200}, {x: 2500, y: 2900, w: 20, h: 60}, {x: 2500, y: 3020, w: 20, h: 80}
    ] 
  },
  { 
    id: "house_gamma", x: 1200, y: 1100, w: 240, h: 240,
    door: { x: 1280, y: 1340, w: 80, h: 16 },
    walls: [
      {x: 1200, y: 1100, w: 240, h: 20}, {x: 1200, y: 1100, w: 20, h: 240},
      {x: 1420, y: 1100, w: 20, h: 240}, {x: 1200, y: 1320, w: 80, h: 20}, {x: 1360, y: 1320, w: 80, h: 20}
    ] 
  },
  { 
    id: "house_hotel", x: 2800, y: 1900, w: 280, h: 240,
    door: { x: 2800, y: 1980, w: 16, h: 80 },
    walls: [
      {x: 2800, y: 1900, w: 280, h: 20}, {x: 2800, y: 2120, w: 280, h: 20},
      {x: 3060, y: 1900, w: 20, h: 240}, {x: 2800, y: 1900, w: 20, h: 80}, {x: 2800, y: 2060, w: 20, h: 80}
    ] 
  }
];

interface PlayerState {
  id: string;
  x: number;
  y: number;
  r: number;
  angle: number;
  hp: number;
  maxHp: number;
  nickname: string;
  email: string;
  isMoving: boolean;
  legCycle: number;
  gold: number;
  weapon: number;
  armor: number;
}

interface BulletState {
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  color: string;
}

interface BotState {
  id: string;
  x: number;
  y: number;
  r: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: "grunt" | "elite" | "HEXA-TITAN";
  shootCooldown: number;
  angle: number;
  isMergedUnit: boolean;
  mergeFactor: number;
}

interface RoomState {
  id: string;
  mode: "1v1" | "br" | "coop";
  players: Record<string, PlayerState>;
  bullets: Array<BulletState>;
  doorsState: Array<{ doorX: number; doorY: number; isOpen: boolean }>;
  bots: Array<BotState>;
}

interface QueueUser {
  socketId: string;
  nickname: string;
  email: string;
}

const queue1v1: Array<QueueUser> = [];
const queueBR: Array<QueueUser> = [];
const queueCoop: Array<QueueUser> = [];

const rooms: Record<string, RoomState> = {};

function checkCollision(nx: number, ny: number, r: number, doorsState: RoomState["doorsState"]) {
  if (nx - r < 0 || nx + r > WORLD_SIZE || ny - r < 0 || ny + r > WORLD_SIZE) return true;
  for (let obs of serverObstacles) {
    for (let wall of obs.walls) {
      if (nx + r > wall.x && nx - r < wall.x + wall.w && ny + r > wall.y && ny - r < wall.y + wall.h) {
        return true;
      }
    }
    const activeDoor = doorsState.find(d => d.doorX === obs.door.x && d.doorY === obs.door.y);
    const isOpen = activeDoor ? activeDoor.isOpen : false;
    if (!isOpen) {
      let d = obs.door;
      if (nx + r > d.x && nx - r < d.x + d.w && ny + r > d.y && ny - r < d.y + d.h) {
        return true;
      }
    }
  }
  return false;
}

function getSafeSpawnCoords(doorsState: RoomState["doorsState"]) {
  let rx, ry, attempts = 0;
  while (attempts < 1000) {
    rx = Math.random() * (WORLD_SIZE - 400) + 200;
    ry = Math.random() * (WORLD_SIZE - 400) + 200;
    let insideBoundaries = false;
    for (let obs of serverObstacles) {
      if (rx + 20 > obs.x - 30 && rx - 20 < obs.x + obs.w + 30 && ry + 20 > obs.y - 30 && ry - 20 < obs.y + obs.h + 30) {
        insideBoundaries = true;
        break;
      }
    }
    if (!insideBoundaries && !checkCollision(rx, ry, 20, doorsState)) {
      return { x: rx, y: ry };
    }
    attempts++;
  }
  return { x: 2000, y: 2000 };
}

function cleanFromAllQueues(socketId: string) {
  const filterFn = (p: QueueUser) => p.socketId !== socketId;
  const idx1 = queue1v1.findIndex(p => p.socketId === socketId);
  if (idx1 !== -1) queue1v1.splice(idx1, 1);
  const idxBR = queueBR.findIndex(p => p.socketId === socketId);
  if (idxBR !== -1) queueBR.splice(idxBR, 1);
  const idxCoop = queueCoop.findIndex(p => p.socketId === socketId);
  if (idxCoop !== -1) queueCoop.splice(idxCoop, 1);
}

function checkAndStartMatches(queue: Array<QueueUser>, mode: "1v1" | "br" | "coop") {
  while (queue.length >= 2) {
    const p1 = queue.shift()!;
    const p2 = queue.shift()!;
    const roomId = `room_${mode}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const initialDoors = serverObstacles.map(obs => ({
      doorX: obs.door.x,
      doorY: obs.door.y,
      isOpen: false
    }));

    const spawnP1 = getSafeSpawnCoords(initialDoors);
    const spawnP2 = getSafeSpawnCoords(initialDoors);

    const roomState: RoomState = {
      id: roomId,
      mode: mode,
      players: {
        [p1.socketId]: {
          id: p1.socketId,
          x: spawnP1.x,
          y: spawnP1.y,
          r: 18,
          angle: 0,
          hp: 100,
          maxHp: 100,
          nickname: p1.nickname,
          email: p1.email,
          isMoving: false,
          legCycle: 0,
          gold: 0,
          weapon: 0,
          armor: 0
        },
        [p2.socketId]: {
          id: p2.socketId,
          x: spawnP2.x,
          y: spawnP2.y,
          r: 18,
          angle: 0,
          hp: 100,
          maxHp: 100,
          nickname: p2.nickname,
          email: p2.email,
          isMoving: false,
          legCycle: 0,
          gold: 0,
          weapon: 0,
          armor: 0
        }
      },
      bullets: [],
      doorsState: initialDoors,
      bots: []
    };

    if (mode === "coop") {
      const botCount = 6;
      for (let i = 0; i < botCount; i++) {
        const bSpawn = getSafeSpawnCoords(initialDoors);
        roomState.bots.push({
          id: `server_bot_${i}_${Math.floor(Math.random() * 10000)}`,
          x: bSpawn.x,
          y: bSpawn.y,
          r: 16,
          speed: 3.2,
          hp: 80,
          maxHp: 80,
          type: i % 2 === 0 ? "elite" : "grunt",
          shootCooldown: 0,
          angle: 0,
          isMergedUnit: false,
          mergeFactor: 1
        });
      }
    }

    rooms[roomId] = roomState;

    const s1 = io.sockets.sockets.get(p1.socketId);
    const s2 = io.sockets.sockets.get(p2.socketId);

    if (s1) {
      s1.join(roomId);
      (s1 as any).roomId = roomId;
      (s1 as any).userData = p1;
      s1.emit("matchFound", { spawn: spawnP1, roomId: roomId, mode: mode, opponent: { nickname: p2.nickname, email: p2.email } });
    }
    if (s2) {
      s2.join(roomId);
      (s2 as any).roomId = roomId;
      (s2 as any).userData = p2;
      s2.emit("matchFound", { spawn: spawnP2, roomId: roomId, mode: mode, opponent: { nickname: p1.nickname, email: p1.email } });
    }

    console.log(`[Multiplayer] Room ${roomId} created with mode ${mode}. Matched ${p1.nickname} and ${p2.nickname}`);
  }
}

io.on("connection", (socket: Socket) => {
  console.log(`Soldier connected: ${socket.id}`);

  socket.on("join1v1Queue", (userData) => {
    cleanFromAllQueues(socket.id);
    queue1v1.push({
      socketId: socket.id,
      nickname: userData.nickname || "Soldier",
      email: userData.email || ""
    });
    console.log(`[Queue] Joined 1v1 Queue. Total waiting: ${queue1v1.length}`);
    checkAndStartMatches(queue1v1, "1v1");
  });

  socket.on("joinBRQueue", (userData) => {
    cleanFromAllQueues(socket.id);
    queueBR.push({
      socketId: socket.id,
      nickname: userData.nickname || "Soldier",
      email: userData.email || ""
    });
    console.log(`[Queue] Joined BR Queue. Total waiting: ${queueBR.length}`);
    checkAndStartMatches(queueBR, "br");
  });

  socket.on("joinCoopQueue", (userData) => {
    cleanFromAllQueues(socket.id);
    queueCoop.push({
      socketId: socket.id,
      nickname: userData.nickname || "Soldier",
      email: userData.email || ""
    });
    console.log(`[Queue] Joined Co-op Queue. Total waiting: ${queueCoop.length}`);
    checkAndStartMatches(queueCoop, "coop");
  });

  socket.on("playerInput", (data) => {
    const rId = (socket as any).roomId;
    if (!rId || !rooms[rId]) return;

    const p = rooms[rId].players[socket.id];
    if (p) {
      p.x = data.x;
      p.y = data.y;
      p.angle = data.angle;
      p.isMoving = data.isMoving;
      p.legCycle = data.legCycle;
      if (data.weapon !== undefined) p.weapon = data.weapon;
      if (data.armor !== undefined) p.armor = data.armor;
    }
  });

  socket.on("fireBullet", (bulletData) => {
    const rId = (socket as any).roomId;
    if (!rId || !rooms[rId]) return;

    const room = rooms[rId];
    const p = room.players[socket.id];
    if (p && p.hp > 0) {
      const dmgMap = [10, 22, 48];
      const damage = dmgMap[p.weapon] || 10;
      const color = p.weapon === 2 ? "#00ffff" : "#ffd700";

      room.bullets.push({
        owner: socket.id,
        x: bulletData.x,
        y: bulletData.y,
        vx: Math.cos(bulletData.angle) * 15,
        vy: Math.sin(bulletData.angle) * 15,
        dmg: damage,
        r: 5,
        color: color
      });
    }
  });

  socket.on("syncMapDoorEvent", (doorData) => {
    const rId = (socket as any).roomId;
    if (!rId || !rooms[rId]) return;

    const room = rooms[rId];
    const targetDoor = room.doorsState.find(d => d.doorX === doorData.doorX && d.doorY === doorData.doorY);
    if (targetDoor) {
      targetDoor.isOpen = doorData.isOpen;
    }
  });

  socket.on("sendRoomChatMessage", (data) => {
    const rId = (socket as any).roomId;
    if (!rId || !rooms[rId]) return;

    const room = rooms[rId];
    const p = room.players[socket.id];
    if (p && data.text) {
      io.to(rId).emit("receiveRoomChatMessage", {
        senderId: socket.id,
        nickname: p.nickname,
        text: data.text
      });
    }
  });

  socket.on("leaveQueue", () => {
    cleanFromAllQueues(socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`Soldier disconnected: ${socket.id}`);
    cleanFromAllQueues(socket.id);

    const rId = (socket as any).roomId;
    if (rId && rooms[rId]) {
      const room = rooms[rId];
      delete room.players[socket.id];

      socket.to(rId).emit("receiveRoomChatMessage", {
        senderId: "system",
        nickname: "HQ SYSTEM",
        text: "Your teammate/rival has disconnected from active operations."
      });

      if (Object.keys(room.players).length === 0) {
        delete rooms[rId];
        console.log(`[Multiplayer] Room ${rId} fully terminated.`);
      }
    }
  });
});

setInterval(() => {
  for (let rId in rooms) {
    const room = rooms[rId];
    const activePlayers = Object.values(room.players);

    for (let i = room.bullets.length - 1; i >= 0; i--) {
      const b = room.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (checkCollision(b.x, b.y, b.r, room.doorsState)) {
        room.bullets.splice(i, 1);
        continue;
      }

      let bulletRemoved = false;
      for (let p of activePlayers) {
        if (p.id !== b.owner && p.hp > 0) {
          const dist = Math.hypot(p.x - b.x, p.y - b.y);
          if (dist < p.r + b.r) {
            const armorsPlat = [0, 2, 5];
            const protection = armorsPlat[p.armor] || 0;
            const finalDmg = Math.max(2, b.dmg - protection);

            p.hp = Math.max(0, p.hp - finalDmg);

            if (p.hp <= 0) {
              const killer = room.players[b.owner];
              if (killer) {
                const bonusGold = room.mode === "1v1" ? 140 : 80;
                killer.gold += bonusGold;
                io.to(room.id).emit("receiveRoomChatMessage", {
                  senderId: "system",
                  nickname: "HQ SYSTEM",
                  text: `${killer.nickname} eliminated ${p.nickname}! (+${bonusGold} Gold reward)`
                });
              }
            }

            room.bullets.splice(i, 1);
            bulletRemoved = true;
            break;
          }
        }
      }

      if (bulletRemoved) continue;

      if (room.mode === "coop" && room.bots.length > 0) {
        for (let j = room.bots.length - 1; j >= 0; j--) {
          const bot = room.bots[j];
          if (bot.hp > 0 && b.owner !== bot.id) {
            const dist = Math.hypot(bot.x - b.x, bot.y - b.y);
            if (dist < bot.r + b.r) {
              bot.hp -= b.dmg;
              room.bullets.splice(i, 1);
              bulletRemoved = true;

              if (bot.hp <= 0) {
                room.bots.splice(j, 1);
                const killer = room.players[b.owner];
                if (killer) {
                  const goldReward = bot.type === "elite" ? 50 : 25;
                  killer.gold += goldReward;
                }
              }
              break;
            }
          }
        }
      }
    }

    if (room.mode === "coop" && room.bots.length > 0 && activePlayers.length > 0) {
      room.bots.forEach(bot => {
        if (bot.hp <= 0) return;

        let closestPlayer: PlayerState | null = null;
        let minDist = 999999;
        activePlayers.forEach(p => {
          if (p.hp > 0) {
            const d = Math.hypot(p.x - bot.x, p.y - bot.y);
            if (d < minDist) {
              minDist = d;
              closestPlayer = p;
            }
          }
        });

        if (closestPlayer) {
          const target: PlayerState = closestPlayer;
          bot.angle = Math.atan2(target.y - bot.y, target.x - bot.x);

          if (minDist < 1000) {
            const bx = bot.x + Math.cos(bot.angle) * bot.speed;
            const by = bot.y + Math.sin(bot.angle) * bot.speed;

            if (!checkCollision(bx, by, bot.r, room.doorsState)) {
              bot.x = bx;
              bot.y = by;
            } else {
              const slideX = bot.x + Math.cos(bot.angle + Math.PI / 2) * bot.speed;
              const slideY = bot.y + Math.sin(bot.angle + Math.PI / 2) * bot.speed;
              if (!checkCollision(slideX, slideY, bot.r, room.doorsState)) {
                bot.x = slideX;
                bot.y = slideY;
              }
            }

            bot.shootCooldown--;
            if (bot.shootCooldown <= 0 && minDist < 450) {
              bot.shootCooldown = bot.type === "elite" ? 30 : 50;
              room.bullets.push({
                owner: bot.id,
                x: bot.x,
                y: bot.y,
                vx: Math.cos(bot.angle) * 11,
                vy: Math.sin(bot.angle) * 11,
                dmg: bot.type === "elite" ? 15 : 8,
                r: 4,
                color: "#ff3d00"
              });
            }
          }
        }
      });
    }

    io.to(room.id).emit("gameUpdate", {
      players: room.players,
      bullets: room.bullets,
      bots: room.bots,
      doorsState: room.doorsState
    });
  }
}, 33);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[TACTICAL SERVER RUNNING ON PORT ${PORT}]`);
  });
}

startServer();