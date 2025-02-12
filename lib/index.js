var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var { Context, Schema } = require("koishi");
var usage = "国王游戏，近乎完美复刻dice！上的国王游戏。本插件还是由deepseek辅助创作，在此也祝愿deepseek能够发展更为壮大。玩法总体和dice！上的国王游戏差不多，只不过有些命令被我修改了，并且逻辑可能会和dice！上的有所不同，这一点请注意。";
module.exports.name = "king-game";
module.exports.using = ["database"];
module.exports.schema = Schema.object({});
module.exports.apply = (ctx) => {
  if (!ctx.database) {
    ctx.logger("king-game").error("数据库插件未启用，请安装并启用 koishi-plugin-database");
    return;
  }
  const Player = {
    qq: "string",
    name: "string"
  };
  const KingGame = {
    id: "unsigned",
    group: "string",
    start: "integer",
    players1: "json",
    players2: "json",
    waitList: "json",
    k: "integer"
  };
  ctx.on("ready", async () => {
    try {
      ctx.model.extend("king_game", KingGame, {
        primary: "id",
        autoInc: true
      });
      ctx.logger("king-game").info("数据库表初始化完成");
    } catch (error) {
      ctx.logger("king-game").error("数据库表初始化失败:", error);
    }
  });
  const getNickname = /* @__PURE__ */ __name((session) => {
    return session.author?.nickname || session.username || `用户${session.userId}`;
  }, "getNickname");
  ctx.command("国王游戏", "启动国王游戏").usage("玩法：先使用【国王游戏 加入】加入国王游戏，然后再用【国王游戏 开始】来指定国王，指定后国王可以用【国王游戏 查看】来查看玩家的编号。").action(async ({ session }) => {
    const group = session.channelId;
    const [existing] = await ctx.database.get("king_game", { group });
    if (existing) return "游戏已经在进行中！";
    await ctx.database.create("king_game", {
      group,
      start: 1,
      players1: [],
      players2: [],
      waitList: [],
      k: 0
    });
    return [
      "游戏已开始！",
      "【国王游戏 加入】加入国王游戏",
      "【国王游戏 开始】指定国王",
      "【国王游戏 退出】退出游戏",
      "【国王游戏 结束】结束游戏"
    ].join("\n");
  });
  ctx.command("国王游戏.加入", "加入国王游戏").action(async ({ session }) => {
    const group = session.channelId;
    const userId = session.userId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏尚未开始";
    const checkPlayer = /* @__PURE__ */ __name((list) => list.some((p) => p.qq === userId), "checkPlayer");
    const nickname = getNickname(session);
    switch (game.start) {
      case 1: {
        if (checkPlayer(game.players1)) return "您已经加入游戏";
        await ctx.database.set("king_game", { group }, {
          players1: [...game.players1, { qq: userId, name: nickname }]
        });
        return `${nickname} 加入游戏，当前 ${game.players1.length + 1} 人`;
      }
      case 2:
      case 3: {
        if (checkPlayer(game.waitList)) return "您已在等待队列";
        await ctx.database.set("king_game", { group }, {
          waitList: [...game.waitList, { qq: userId, name: nickname }]
        });
        return `${nickname} 加入等待队列，当前 ${game.waitList.length + 1} 人`;
      }
      default:
        return "当前无法加入游戏";
    }
  });
  ctx.command("国王游戏.开始", "开始游戏").action(async ({ session }) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏尚未开始";
    if (game.start !== 1) return "游戏已经进行中";
    if (game.players1.length < 3) return "玩家不足3人";
    const shuffle = /* @__PURE__ */ __name((arr) => [...arr].sort(() => Math.random() - 0.5), "shuffle");
    const players2 = shuffle(game.players1);
    const k = Math.floor(Math.random() * players2.length) + 1;
    await ctx.database.set("king_game", { group }, {
      players2,
      players1: [],
      k,
      start: 2
    });
    const king = players2[k - 1];
    return `游戏开始！当前玩家：${players2.length}人
国王是：${king.name}
请国王发送【编号列表】`;
  });
  ctx.command("国王游戏.查看", "查看玩家编号").action(async ({ session }) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏尚未开始";
    const players = game.start % 2 === 0 ? game.players2 : game.players1;
    const list = players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    if ([2, 4].includes(game.start)) {
      const king = game.start === 2 ? game.players2[game.k - 1] : game.players1[game.k - 1];
      if (session.userId !== king.qq) return "只有国王可以查看编号";
      await ctx.database.set("king_game", { group }, { start: game.start + 1 });
    }
    return `玩家列表：
${list}
使用【序号】选择玩家`;
  });
  ctx.command("国王游戏.退出", "退出游戏").action(async ({ session }) => {
    const group = session.channelId;
    const userId = session.userId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏尚未开始";
    const filter = /* @__PURE__ */ __name((list) => list.filter((p) => p.qq !== userId), "filter");
    await ctx.database.set("king_game", { group }, {
      players1: filter(game.players1),
      players2: filter(game.players2),
      waitList: filter(game.waitList)
    });
    return "已退出游戏";
  });
  ctx.command("国王游戏.结束", "结束游戏").action(async ({ session }) => {
    const group = session.channelId;
    await ctx.database.remove("king_game", { group });
    return "游戏已结束";
  });
  ctx.command("国王游戏.国王", "查看当前国王").action(async ({ session }) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏尚未开始";
    const players = game.start % 2 === 0 ? game.players2 : game.players1;
    const king = players[game.k - 1];
    return `当前国王是：${king?.name || "未知"}`;
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  usage
});
