const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

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

const queue1v1 = [];
const queueBR = [];
const queueCoop = [];

const rooms = {};

// Helper function to detect wall/door collisions
function checkCollision(nx, ny, r, doorsState) {
  if (nx - r < 0 || nx + r > WORLD_SIZE || ny - r < 0 || ny + r > WORLD_SIZE) return true;
  for (let obs of serverObstacles) {
    for (let wall of obs.walls) {
      if (nx + r > wall.x && nx - r < wall.x + wall.w && ny + r > wall.y && ny - r < wall.y + wall.h) {
        return true;
      }
    }
    // Check if matching doors are closed
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

function getSafeSpawnCoords(doorsState) {
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

// Clean player from any queue
function cleanFromAllQueues(socketId) {
  const idx1 = queue1v1.findIndex(p => p.socketId === socketId);
  if (idx1 !== -1) queue1v1.splice(idx1, 1);
  const idxBR = queueBR.findIndex(p => p.socketId === socketId);
  if (idxBR !== -1) queueBR.splice(idxBR, 1);
  const idxCoop = queueCoop.findIndex(p => p.socketId === socketId);
  if (idxCoop !== -1) queueCoop.splice(idxCoop, 1);
}

// Initialize and match players
function checkAndStartMatches(queue, mode) {
  while (queue.length >= 2) {
    const p1 = queue.shift();
    const p2 = queue.shift();
    const roomId = `room_${mode}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const initialDoors = serverObstacles.map(obs => ({
      doorX: obs.door.x,
      doorY: obs.door.y,
      isOpen: false
    }));

    const spawnP1 = getSafeSpawnCoords(initialDoors);
    const spawnP2 = getSafeSpawnCoords(initialDoors);

    const roomState = {
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
          armor: 0,
          diedDuringMatch: false
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
          armor: 0,
          diedDuringMatch: false
        }
      },
      bullets: [],
      doorsState: initialDoors,
      bots: [],
      roomFinished: false
    };

    // Spawn server hostile bots in Co-op mode
    if (mode === "coop") {
      const botCount = 8; // Intense alliance vs bots combat
      for (let i = 0; i < botCount; i++) {
        const bSpawn = getSafeSpawnCoords(initialDoors);
        roomState.bots.push({
          id: `server_bot_${i}_${Math.floor(Math.random() * 10000)}`,
          x: bSpawn.x,
          y: bSpawn.y,
          r: 16,
          speed: 3.0, // Reduced speed slightly for smoother network rendering
          hp: 80,
          maxHp: 80,
          type: i % 3 === 0 ? "elite" : "grunt",
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
      s1.roomId = roomId;
      s1.userData = p1;
      s1.emit("matchFound", { spawn: spawnP1, roomId: roomId, mode: mode, opponent: { nickname: p2.nickname, email: p2.email } });
    }
    if (s2) {
      s2.join(roomId);
      s2.roomId = roomId;
      s2.userData = p2;
      s2.emit("matchFound", { spawn: spawnP2, roomId: roomId, mode: mode, opponent: { nickname: p1.nickname, email: p1.email } });
    }

    console.log(`[Multiplayer] Room ${roomId} created with mode ${mode}. Matched ${p1.nickname} and ${p2.nickname}`);
  }
}

// Geometry helpers for RPG Explosions and obstacle line-of-sight checking
function lineIntersectsObstacle(x1, y1, x2, y2) {
  for (let obs of serverObstacles) {
    if (lineIntersectsRect(x1, y1, x2, y2, obs.x, obs.y, obs.w, obs.h)) {
      return true;
    }
  }
  return false;
}

function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  let minX = Math.min(x1, x2);
  let maxX = Math.max(x1, x2);
  let minY = Math.min(y1, y2);
  let maxY = Math.max(y1, y2);
  
  if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) {
    return false;
  }
  
  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;
  
  if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry, rx, ry + rh)) return true;
  if (lineSegmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)) return true;
  
  return false;
}

function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  let det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (det === 0) return false;
  
  let lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
  let gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
  
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

function triggerServerRPGExplosion(room, ex, ey, ownerId) {
  io.to(room.id).emit("rpgExplode", { x: ex, y: ey });

  let targets = [];
  
  Object.values(room.players).forEach(p => {
    if (p.hp > 0) {
      let dist = Math.hypot(p.x - ex, p.y - ey);
      if (dist < 130 + p.r) {
        targets.push({ type: "player", obj: p, dist: dist });
      }
    }
  });
  
  room.bots.forEach(bot => {
    if (bot.hp > 0) {
      let dist = Math.hypot(bot.x - ex, bot.y - ey);
      if (dist < 130 + bot.r) {
        targets.push({ type: "bot", obj: bot, dist: dist });
      }
    }
  });
  
  targets.sort((a, b) => a.dist - b.dist);
  
  let hits = 0;
  for (let t of targets) {
    if (hits >= 2) break; // limit to 2 splash targets
    
    if (!lineIntersectsObstacle(ex, ey, t.obj.x, t.obj.y)) {
      let baseDamage = 100;
      if (t.type === "player") {
        const armorsPlat = [0, 3, 5, 8, 11, 15];
        const protection = armorsPlat[t.obj.armor] || 0;
        let finalDmg = Math.max(10, baseDamage - protection);
        t.obj.hp = Math.max(0, t.obj.hp - finalDmg);
        
        if (t.obj.hp <= 0) {
          t.obj.diedDuringMatch = true; // Mark as died during the match for co-op prize calculations
          const killer = room.players[ownerId];
          if (killer) {
            const bonusGold = room.mode === "1v1" ? 140 : 80;
            killer.gold += bonusGold;
            io.to(room.id).emit("receiveRoomChatMessage", {
              senderId: "system",
              nickname: "HQ SYSTEM",
              text: `${killer.nickname} eliminated ${t.obj.nickname} with RPG! (+${bonusGold} Gold reward)`
            });
          }
        }
      } else {
        t.obj.hp = Math.max(0, t.obj.hp - baseDamage);
        if (t.obj.hp <= 0) {
          const idx = room.bots.findIndex(b => b.id === t.obj.id);
          if (idx !== -1) room.bots.splice(idx, 1);
          const killer = room.players[ownerId];
          if (killer) {
            killer.gold += 30; // Online bots give 30 gold per kill
          }
        }
      }
      hits++;
    }
  }
}

io.on("connection", (socket) => {
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
    const rId = socket.roomId;
    if (!rId || !rooms[rId]) return;

    const p = rooms[rId].players[socket.id];
    if (p) {
      // Allow spectating player to send input for viewpoint changes but lock position if dead
      if (p.hp > 0) {
        p.x = data.x;
        p.y = data.y;
        p.angle = data.angle;
        p.isMoving = data.isMoving;
        p.legCycle = data.legCycle;
      }
      if (data.weapon !== undefined) p.weapon = data.weapon;
      if (data.armor !== undefined) p.armor = data.armor;
    }
  });

  socket.on("fireBullet", (bulletData) => {
    const rId = socket.roomId;
    if (!rId || !rooms[rId]) return;

    const room = rooms[rId];
    const p = room.players[socket.id];
    if (p && p.hp > 0) {
      const dmgMap = [6, 14, 24, 32, 70, 100];
      const rangeMap = [220, 400, 650, 1000, 350, 3000];
      
      let damage = dmgMap[p.weapon] || 6;
      let rangeLeft = rangeMap[p.weapon] || 250;
      let r = 5;
      let color = "#ffd700";
      let isRPG = false;
      
      if (p.weapon === 2) color = "#00ffff";
      if (p.weapon === 4) {
        r = 3;
        color = "#e67e22";
      } else if (p.weapon === 5) {
        r = 8;
        color = "#f1c40f";
        isRPG = true;
      }

      room.bullets.push({
        id: bulletData.id,
        owner: socket.id,
        x: bulletData.x,
        y: bulletData.y,
        vx: Math.cos(bulletData.angle) * 15,
        vy: Math.sin(bulletData.angle) * 15,
        dmg: damage,
        r: r,
        color: color,
        weaponId: p.weapon,
        rangeLeft: rangeLeft,
        isRPG: isRPG
      });
    }
  });

  socket.on("syncMapDoorEvent", (doorData) => {
    const rId = socket.roomId;
    if (!rId || !rooms[rId]) return;

    const room = rooms[rId];
    const targetDoor = room.doorsState.find(d => d.doorX === doorData.doorX && d.doorY === doorData.doorY);
    if (targetDoor) {
      targetDoor.isOpen = doorData.isOpen;
    }
  });

  socket.on("sendRoomChatMessage", (data) => {
    const rId = socket.roomId;
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

  socket.on("leaveActiveRoom", () => {
    const rId = socket.roomId;
    if (rId && rooms[rId]) {
      const room = rooms[rId];
      delete room.players[socket.id];
      socket.leave(rId);
      delete socket.roomId;

      const remainingIds = Object.keys(room.players);
      if (remainingIds.length > 0) {
        if (room.mode !== "coop") {
          io.to(rId).emit("matchFinished", {
            mode: room.mode,
            winnerId: remainingIds[0],
            reason: "disconnect"
          });
          delete rooms[rId];
        } else {
          io.to(rId).emit("receiveRoomChatMessage", {
            senderId: "system",
            nickname: "HQ SYSTEM",
            text: `Your teammate left the field of operation.`
          });
          // Check if all remaining players are dead
          const allRemainingDead = remainingIds.every(id => room.players[id].hp <= 0);
          if (allRemainingDead) {
            io.to(rId).emit("matchFinished", {
              mode: "coop",
              winnerId: "bots",
              reason: "elimination"
            });
            delete rooms[rId];
          }
        }
      } else {
        delete rooms[rId];
      }
    }
  });

  socket.on("leaveQueue", () => {
    cleanFromAllQueues(socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`Soldier disconnected: ${socket.id}`);
    cleanFromAllQueues(socket.id);

    const rId = socket.roomId;
    if (rId && rooms[rId]) {
      const room = rooms[rId];
      delete room.players[socket.id];

      socket.to(rId).emit("receiveRoomChatMessage", {
        senderId: "system",
        nickname: "HQ SYSTEM",
        text: "Your teammate/rival has disconnected from active operations."
      });

      const remainingIds = Object.keys(room.players);
      if (remainingIds.length > 0) {
        if (room.mode !== "coop") {
          io.to(rId).emit("matchFinished", {
            mode: room.mode,
            winnerId: remainingIds[0],
            reason: "disconnect"
          });
          delete rooms[rId];
        } else {
          // If co-op, check if remaining player is dead
          const allRemainingDead = remainingIds.every(id => room.players[id].hp <= 0);
          if (allRemainingDead) {
            io.to(rId).emit("matchFinished", {
              mode: "coop",
              winnerId: "bots",
              reason: "elimination"
            });
            delete rooms[rId];
          }
        }
      } else {
        delete rooms[rId];
        console.log(`[Multiplayer] Room ${rId} fully terminated.`);
      }
    }
  });
});

// Authoritative physics loop ticking at 30 FPS (33ms)
setInterval(() => {
  for (let rId in rooms) {
    const room = rooms[rId];
    if (room.roomFinished) continue;

    const activePlayers = Object.values(room.players);

    // 1. Projectile physics and bounds/collisions checks
    for (let i = room.bullets.length - 1; i >= 0; i--) {
      const b = room.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (b.rangeLeft !== undefined) {
        b.rangeLeft -= Math.hypot(b.vx, b.vy);
        if (b.rangeLeft <= 0) {
          room.bullets.splice(i, 1);
          continue;
        }
      }

      if (checkCollision(b.x, b.y, b.r, room.doorsState)) {
        if (b.isRPG) {
          triggerServerRPGExplosion(room, b.x, b.y, b.owner);
        }
        room.bullets.splice(i, 1);
        continue;
      }

      let bulletRemoved = false;
      for (let p of activePlayers) {
        if (p.id !== b.owner && p.hp > 0) {
          const dist = Math.hypot(p.x - b.x, p.y - b.y);
          if (dist < p.r + b.r) {
            if (b.isRPG) {
              triggerServerRPGExplosion(room, b.x, b.y, b.owner);
            } else {
              const armorsPlat = [0, 3, 5, 8, 11, 15];
              const protection = armorsPlat[p.armor] || 0;
              const finalDmg = Math.max(2, b.dmg - protection);

              p.hp = Math.max(0, p.hp - finalDmg);

              if (p.hp <= 0) {
                p.diedDuringMatch = true;
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
              if (b.isRPG) {
                triggerServerRPGExplosion(room, b.x, b.y, b.owner);
              } else {
                bot.hp -= b.dmg;
                if (bot.hp <= 0) {
                  room.bots.splice(j, 1);
                  const killer = room.players[b.owner];
                  if (killer) {
                    killer.gold += 30; // 30 Gold for bot kill online
                  }
                }
              }
              room.bullets.splice(i, 1);
              bulletRemoved = true;
              break;
            }
          }
        }
      }
    }

    // 2. Co-op Bot movement and behavior update logic
    if (room.mode === "coop" && room.bots.length > 0 && activePlayers.length > 0) {
      room.bots.forEach(bot => {
        if (bot.hp <= 0) return;

        let closestPlayer = null;
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
          const target = closestPlayer;
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
                id: `bot_bullet_${Math.random()}`,
                owner: bot.id,
                x: bot.x,
                y: bot.y,
                vx: Math.cos(bot.angle) * 11,
                vy: Math.sin(bot.angle) * 11,
                dmg: bot.type === "elite" ? 15 : 8,
                r: 4,
                color: "#ff3d00",
                weaponId: bot.type === "elite" ? 2 : 1,
                rangeLeft: 500
              });
            }
          }
        }
      });
    }

    // 3. Auth Game Mode Victory / Defeat State checks
    let roomFinished = false;
    const playersList = Object.values(room.players);
    if ((room.mode === "1v1" || room.mode === "br") && playersList.length === 2) {
      const deadPlayer = playersList.find(p => p.hp <= 0);
      if (deadPlayer) {
        const winner = playersList.find(p => p.hp > 0);
        if (winner) {
          io.to(room.id).emit("matchFinished", {
            mode: room.mode,
            winnerId: winner.id,
            reason: "elimination"
          });
          room.roomFinished = true;
          delete rooms[rId];
          roomFinished = true;
        }
      }
    } else if (room.mode === "coop" && playersList.length > 0) {
      const allDead = playersList.every(p => p.hp <= 0);
      if (allDead) {
        io.to(room.id).emit("matchFinished", {
          mode: "coop",
          winnerId: "bots",
          reason: "elimination"
        });
        room.roomFinished = true;
        delete rooms[rId];
        roomFinished = true;
      } else if (room.bots.length === 0) {
        // Alliance VICTORY! Calculate shares dynamically!
        const p1 = playersList[0];
        const p2 = playersList[1];

        const totalGoldEarned = (p1 ? p1.gold : 0) + (p2 ? p2.gold : 0) + 100;
        
        let p1Share = 0;
        let p2Share = 0;

        const p1Died = p1 ? p1.diedDuringMatch : false;
        const p2Died = p2 ? p2.diedDuringMatch : false;

        if (!p1Died && !p2Died) {
          // Neither died: equal split
          p1Share = Math.floor(totalGoldEarned / 2);
          p2Share = Math.floor(totalGoldEarned / 2);
        } else {
          // If one died and the other survived: dead player takes 30% of total pool, surviving player gets 70%
          if (p1 && p1Died) {
            p1Share = Math.floor(totalGoldEarned * 0.3);
            p2Share = totalGoldEarned - p1Share;
          } else if (p2 && p2Died) {
            p2Share = Math.floor(totalGoldEarned * 0.3);
            p1Share = totalGoldEarned - p2Share;
          } else {
            p1Share = Math.floor(totalGoldEarned / 2);
            p2Share = Math.floor(totalGoldEarned / 2);
          }
        }

        io.to(room.id).emit("matchFinished", {
          mode: "coop",
          winnerId: "team",
          reason: "clear",
          shares: {
            [p1 ? p1.id : ""]: p1Share,
            [p2 ? p2.id : ""]: p2Share
          },
          totalPool: totalGoldEarned
        });
        room.roomFinished = true;
        delete rooms[rId];
        roomFinished = true;
      }
    }

    if (roomFinished) continue;

    // 4. Emit synchronized game state update packet
    io.to(room.id).emit("gameUpdate", {
      players: room.players,
      bullets: room.bullets,
      bots: room.bots,
      doorsState: room.doorsState
    });
  }
}, 33);

// Serve static index.html or SPA root
app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[TACTICAL SERVER RUNNING ON PORT ${PORT}]`);
});