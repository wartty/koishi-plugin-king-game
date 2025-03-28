var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
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
  apply: () => apply,
  name: () => name,
  schema: () => schema,
  usage: () => usage,
  using: () => using
});
module.exports = __toCommonJS(src_exports);
var { Context, Schema } = require("koishi");
var usage = `
这次更新修复了一部分bug（切换到 King-Game 插件时候会出现迟缓之类的），并且小小的增加了一点设置项目。
顺便，这次更新发现其实阿里的qwen2.5模型也挺好用的，deepseek适合用于构建项目，qwen2.5用在现有的项目上修改。
总之，很感谢这两个ai参与代码的构建。

## 功能
- 命令列表：
  - 【国王游戏 加入】加入游戏
  - 【国王游戏 开始】开始游戏（需3人）
  - 【国王游戏 国王】随机选国王
  - 【国王游戏 set】指定互动（国王专用）
  - 【国王游戏 查看】查看玩家列表
  - 【国王游戏 继续】进入下一轮
  - 【国王游戏 退出】退出游戏
  - 【国王游戏 结束】强制结束
`;
var name = "king-game";
var using = ["database"];
var schema = Schema.object({
  maxPlayers: Schema.number().min(3).max(20).default(10).description("最大玩家人数")
});
var utils = {
  getNickname: /* @__PURE__ */ __name((session) => session.author?.nickname || session.username || `用户${session.userId}`, "getNickname"),
  secureShuffle: /* @__PURE__ */ __name((array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, "secureShuffle"),
  formatPlayerList: /* @__PURE__ */ __name((players) => players.map((p, i) => `${i + 1}. ${p.name}`).join("\n"), "formatPlayerList")
};
var handleDatabaseError = /* @__PURE__ */ __name((ctx, error, message = "操作失败") => {
  ctx.logger("king-game").error(`${message}:`, error);
  return "系统异常，请稍后重试";
}, "handleDatabaseError");
var apply = /* @__PURE__ */ __name((ctx) => {
  if (!ctx.database) {
    ctx.logger("king-game").error("需要启用数据库插件");
    return;
  }
  const GAME_STATE = {
    NOT_STARTED: 0,
    WAITING: 1,
    KING_SELECTED: 2,
    INTERACTION_SET: 3
  };
  const KingGame = {
    id: "unsigned",
    group: "string",
    state: "integer",
    players: "json",
    shuffledPlayers: "json",
    kingIndex: "integer",
    interaction: "string"
  };
  ctx.on("plugin/load", () => {
    ctx.logger("king-game").info("插件加载中...");
    try {
      if (!ctx.database) {
        throw new Error("数据库插件未启用");
      }
      ctx.logger("king-game").info("插件加载成功");
    } catch (error) {
      ctx.logger("king-game").error("插件加载失败:", error);
    }
  });
  ctx.on("ready", async () => {
    try {
      ctx.model.extend("king_game", KingGame, { primary: "id", autoInc: true });
      ctx.logger("king-game").info("数据库初始化成功");
    } catch (error) {
      ctx.logger("king-game").error("数据库初始化失败:", error);
    }
  });
  const getNickname = /* @__PURE__ */ __name((session) => {
    return session.author?.nickname || session.username || `用户${session.userId}`;
  }, "getNickname");
  const secureShuffle = /* @__PURE__ */ __name((array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, "secureShuffle");
  const checkPlayerStatus = /* @__PURE__ */ __name(async (session) => {
    const group = session.channelId;
    const userId = session.userId;
    const [game] = await ctx.database.get("king_game", { group });
    return {
      inGame: !!game?.players.some((p) => p.qq === userId),
      isKing: game?.players[game.kingIndex]?.qq === userId,
      gameState: game?.state
    };
  }, "checkPlayerStatus");
  const gameStateMiddleware = /* @__PURE__ */ __name(async (session, next) => {
    const { inGame } = await checkPlayerStatus(session);
    return inGame ? next() : "❌ 指令错误，请先使用【国王游戏 加入】加入游戏！";
  }, "gameStateMiddleware");
  const protectedCommands = [
    "开始",
    "国王",
    "查看",
    "继续",
    "退出",
    "结束"
  ];
  protectedCommands.forEach((command) => {
    ctx.command(`国王游戏.${command}`).use(gameStateMiddleware);
  });
  ctx.command("国王游戏", "国王游戏").action(() => [
    "==========命令菜单==========",
    "【国王游戏 加入】加入游戏",
    "【国王游戏 开始】开始游戏（需3人）",
    "【国王游戏 国王】随机选国王",
    "【国王游戏 set】指定互动（国王专用）",
    "【国王游戏 查看】查看玩家列表",
    "【国王游戏 继续】进入下一轮",
    "【国王游戏 退出】退出游戏",
    "【国王游戏 结束】强制结束",
    "============================",
    "帮助：先用命令【国王游戏 加入】，然后再用【国王游戏 开始】。",
    "开始之后可以用【国王游戏 国王】指令来随机选取国王，然后国王可以使用国王专属命令【国王游戏 set】来确定两人的互动内容。",
    "【国王游戏 set】的使用示例：【国王游戏 set 1 3 抱一下】，随后便会输出随机排列的玩家名单。",
    "其他指令：",
    "【国王游戏 查看】该命令在还没有选出国王前游戏中的任何人都可以使用，而在选出国王后，除非国王使用了【国王游戏 set】，不然都是没有权限。以及，使用【国王游戏 set】之后不管是玩家还是国王，都输出的随机排列的玩家名单。",
    "【国王游戏 继续】该命令用来开启下一局，仅游戏对局中的玩家可用",
    "【国王游戏 退出】该命令用来退出游戏，仅游戏对局中的玩家可用",
    "【国王游戏 结束】该命令用来结束游戏，仅游戏对局中的玩家可用"
  ].join("\n"));
  ctx.command("国王游戏.加入", "加入游戏").action(async ({ session }) => {
    const group = session.channelId;
    const userId = session.userId;
    try {
      const [existing] = await ctx.database.get("king_game", { group });
      const currentGame = existing || await ctx.database.create("king_game", {
        group,
        state: GAME_STATE.NOT_STARTED,
        players: [],
        kingIndex: -1,
        interaction: "",
        shuffledPlayers: []
      });
      if (currentGame.players.some((p) => p.qq === userId)) {
        return "您已加入游戏！";
      }
      const newPlayer = { qq: userId, name: utils.getNickname(session) };
      const updatedPlayers = [...currentGame.players, newPlayer];
      await ctx.database.set("king_game", { group }, { players: updatedPlayers });
      return `${newPlayer.name} 加入成功！当前玩家：${updatedPlayers.length}人`;
    } catch (error) {
      return handleDatabaseError(ctx, error, "加入游戏失败");
    }
  });
  ctx.command("国王游戏.开始", "开始游戏（需3人）").action(async ({ session }) => {
    const group = session.channelId;
    try {
      const [game] = await ctx.database.get("king_game", { group });
      if (!game) return "请先使用【国王游戏 加入】创建游戏";
      if (game.players.length < 3) return "玩家不足3人，无法开始！";
      if (game.state !== GAME_STATE.NOT_STARTED) return "游戏已在进行中！";
      await ctx.database.set("king_game", { group }, {
        state: GAME_STATE.WAITING
      });
      ctx.logger("king-game").info(`游戏已启动，群组ID: ${group}`);
      return "游戏已启动！请使用【国王游戏 国王】选择国王";
    } catch (error) {
      ctx.logger("king-game").error("启动失败:", error);
      return "游戏启动失败";
    }
  });
  ctx.command("国王游戏.国王", "随机选择国王").action(async ({ session }) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game || game.state !== GAME_STATE.WAITING) return "当前不能选择国王";
    if (game.players.length < 3) return "玩家不足3人";
    const kingIndex = Math.floor(Math.random() * game.players.length);
    await ctx.database.set("king_game", { group }, {
      kingIndex,
      state: GAME_STATE.KING_SELECTED
    });
    const king = game.players[kingIndex];
    return `👑 国王已选出：${king.name}
请国王使用【国王游戏 set 1 3 互动内容】指定互动`;
  });
  ctx.command("国王游戏.set <from> <to> <action:text>", "指定互动（国王专用）").usage("示例：国王游戏 set 1 3 抱一下").action(async ({ session }, from, to, action) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    if (isNaN(from) || isNaN(to)) return "❌ 参数错误，请使用数字编号";
    const { inGame, isKing, gameState } = await checkPlayerStatus(session);
    if (!inGame) return "❌ 指令错误，请先加入游戏！";
    if (gameState !== GAME_STATE.KING_SELECTED) return "❌ 当前不能设置互动";
    if (!isKing) return "❌ 仅国王可以使用此命令";
    const shuffled = secureShuffle(game.players);
    const interaction = `${from}号 ${action} ${to}号`;
    await ctx.database.set("king_game", { group }, {
      shuffledPlayers: shuffled,
      interaction,
      state: GAME_STATE.INTERACTION_SET
    });
    return [
      `🎯 互动设置：${interaction}`,
      "🔀 随机顺序：",
      ...shuffled.map((p, i) => `${i + 1}. ${p.name}`)
    ].join("\n");
  });
  ctx.command("国王游戏.查看", "查看玩家列表").action(async ({ session }) => {
    const group = session.channelId;
    const userId = session.userId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game?.players.some((p) => p.qq === userId)) {
      return "❌ 您不在游戏中，请先【国王游戏 加入】";
    }
    switch (game.state) {
      case GAME_STATE.NOT_STARTED:
      case GAME_STATE.WAITING:
        return `当前玩家：
${utils.formatPlayerList(game.players)}`;
      case GAME_STATE.KING_SELECTED:
        const isKing = game.players[game.kingIndex]?.qq === userId;
        return isKing ? `👑 国王视角（原顺序）：
${utils.formatPlayerList(game.players)}` : "⚠️ 权限不足，等待国王设置互动";
      case GAME_STATE.INTERACTION_SET:
        return [
          `🎯 当前互动：${game.interaction}`,
          "🔀 随机顺序：",
          utils.formatPlayerList(game.shuffledPlayers)
        ].join("\n");
      default:
        return "游戏状态异常";
    }
  });
  ctx.command("国王游戏.继续", "进入下一轮").action(async ({ session }) => {
    const group = session.channelId;
    const [game] = await ctx.database.get("king_game", { group });
    await ctx.database.set("king_game", { group }, {
      state: GAME_STATE.WAITING,
      kingIndex: -1,
      interaction: "",
      shuffledPlayers: []
    });
    return [
      "♻️ 新回合开始！",
      "当前玩家：",
      ...game.players.map((p, i) => `${i + 1}. ${p.name}`),
      "请使用【国王游戏 国王】选择新国王"
    ].join("\n");
  });
  ctx.command("国王游戏.退出", "退出游戏").action(async ({ session }) => {
    const group = session.channelId;
    const userId = session.userId;
    const [game] = await ctx.database.get("king_game", { group });
    if (!game) return "游戏未进行";
    const newPlayers = game.players.filter((p) => p.qq !== userId);
    await ctx.database.set("king_game", { group }, { players: newPlayers });
    return `已退出游戏！剩余玩家：${newPlayers.length}人`;
  });
  ctx.command("国王游戏.结束", "结束游戏").action(async ({ session }) => {
    const group = session.channelId;
    await ctx.database.remove("king_game", { group });
    return "游戏已强制结束！";
  });
  ctx.on("ready", async () => {
    try {
      ctx.logger("king-game").info("注册命令到 Koishi 系统...");
      ctx.command("国王游戏", "国王游戏主命令");
      ctx.command("国王游戏.加入", "加入游戏");
      ctx.command("国王游戏.开始", "开始游戏（需3人）");
      ctx.command("国王游戏.国王", "随机选择国王");
      ctx.command("国王游戏.set <from> <to> <action:text>", "指定互动（国王专用）");
      ctx.command("国王游戏.查看", "查看玩家列表");
      ctx.command("国王游戏.继续", "进入下一轮");
      ctx.command("国王游戏.退出", "退出游戏");
      ctx.command("国王游戏.结束", "结束游戏");
      ctx.logger("king-game").info("命令注册完成");
    } catch (error) {
      ctx.logger("king-game").error("命令注册失败:", error);
    }
  });
  ctx.on("plugin/settings", async () => {
    ctx.logger("king-game").info("尝试加载设置界面");
    try {
      const settings = await ctx.getSettings("king-game");
      ctx.logger("king-game").info("当前设置:", settings);
    } catch (error) {
      ctx.logger("king-game").error("设置界面加载失败:", error);
    }
  });
  ctx.on("command/before-execute", ({ command }) => {
    try {
      if (command.name.startsWith("国王游戏")) {
        ctx.logger("king-game").debug(`正在执行命令: ${command.name}`);
      }
    } catch (error) {
      ctx.logger("king-game").error(`命令执行前异常: ${error.message}`);
    }
  });
  ctx.on("command/after-execute", ({ command, error }) => {
    try {
      if (command.name.startsWith("国王游戏")) {
        if (error) {
          ctx.logger("king-game").error(`命令执行后异常: ${error.message}`);
        } else {
          ctx.logger("king-game").debug(`命令执行成功: ${command.name}`);
        }
      }
    } catch (error2) {
      ctx.logger("king-game").error(`命令执行后日志记录异常: ${error2.message}`);
    }
  });
}, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apply,
  name,
  schema,
  usage,
  using
});
