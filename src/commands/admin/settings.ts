import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../types/commands.js";
import { config } from "../../utils/config.js";
import {
  getRuntimeSettings,
  setRateLimitPerMin,
  setLimitMode,
} from "../../services/settingsService.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("查看或修改 Bot 设置 (仅管理员)")
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("查看当前设置")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set_rate_limit")
        .setDescription("设置每分钟全局请求上限")
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("每分钟请求数 (1-60)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(60)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set_limit_mode")
        .setDescription("开关 NovelAI 限制模式 (1024x1024 以下无限额度)")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("是否启用限制模式")
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const isAdmin = config.discord.adminIds.includes(userId);

    if (!isAdmin) {
      await interaction.reply({
        content: "❌ 你没有权限使用此命令。",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    if (subcommand === "show") {
      const settings = getRuntimeSettings();

      const embed = new EmbedBuilder()
        .setColor(0x7289da)
        .setTitle("⚙ 当前设置")
        .addFields(
          {
            name: "⏱ 每分钟请求数",
            value: `${settings.rateLimitPerMin}`,
          },
          {
            name: "⛔ NAI 限制模式",
            value: settings.novelaiLimitMode ? "已启用" : "已关闭",
          }
        )
        .setFooter({
          text: "仅 ADMIN_USER_IDS 中的用户可以修改设置",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "set_rate_limit") {
      const value = interaction.options.getInteger("value", true);
      const before = getRuntimeSettings();
      const after = setRateLimitPerMin(value);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ 已更新每分钟请求数")
        .addFields(
          {
            name: "之前",
            value: `${before.rateLimitPerMin}`,
            inline: true,
          },
          {
            name: "现在",
            value: `${after.rateLimitPerMin}`,
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "set_limit_mode") {
      const enabled = interaction.options.getBoolean("enabled", true);
      const before = getRuntimeSettings();
      const after = setLimitMode(enabled);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ 已更新 NAI 限制模式")
        .addFields(
          {
            name: "之前",
            value: before.novelaiLimitMode ? "已启用" : "已关闭",
            inline: true,
          },
          {
            name: "现在",
            value: after.novelaiLimitMode ? "已启用" : "已关闭",
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await interaction.editReply({
      content: "❌ 未知子命令",
    });
  },
};
