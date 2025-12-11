import OpenAI from "openai";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.baseUrl,
});

/**
 * 工具调用定义 - 只输出场景内容标签
 * 不包含 quality/style tags，这些由预设系统处理
 */
const translateTagsTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "output_scene_tags",
    description:
      "Output the translated scene description tags (without quality or style tags)",
    parameters: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description:
            "Subject tags: character count (1girl, 2boys), identity, physical features (hair, eyes), expression, clothing",
        },
        action: {
          type: "string",
          description:
            "Action and pose tags: standing, sitting, holding, looking at viewer, hand gestures, etc.",
        },
        scene: {
          type: "string",
          description:
            "Scene tags: location, background, lighting, atmosphere, time of day, weather effects",
        },
        composition: {
          type: "string",
          description:
            "Composition tags: framing (portrait, full body, cowboy shot), camera angle (from above, from below), etc.",
        },
        emphasis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tag: { type: "string", description: "Tag to emphasize" },
              weight: {
                type: "number",
                description:
                  "Weight value: >1 for stronger, <1 for weaker, negative for removal (V4.5)",
              },
            },
            required: ["tag", "weight"],
          },
          description:
            "Tags that need emphasis adjustment. Use weight >1 for important elements, <1 for subtle elements",
        },
      },
      required: ["subject", "scene"],
    },
  },
};

const SYSTEM_PROMPT = `You are an expert AI image prompt translator for NovelAI Diffusion. Your task is to convert natural language descriptions into structured scene tags.

## Important: DO NOT include quality tags
Quality tags (masterpiece, best quality, etc.) are handled separately by the preset system. You should ONLY output scene content.

## Tag Output Guidelines

### Subject Tags
- Character count: 1girl, 1boy, 2girls, multiple boys, solo
- Physical features: hair color + style (blonde hair, long hair), eye color (blue eyes), body type
- Expression: smile, closed eyes, open mouth, blush, crying
- Clothing: describe from top to bottom (white shirt, blue skirt, black stockings)

### Action Tags  
- Poses: standing, sitting, lying, kneeling, walking, running
- Actions: holding [object], looking at viewer, looking away, hand on hip
- Interactions: hugging, holding hands, source#action / target#action for multi-character

### Scene Tags
- Location: indoors, outdoors, classroom, bedroom, forest, city
- Background: sky, clouds, trees, buildings, window
- Lighting: sunlight, moonlight, dramatic lighting, backlighting, rim light
- Atmosphere: rain, snow, fog, particles, petals, sparkles
- Time: day, night, sunset, dawn, dusk

### Composition Tags
- Framing: portrait, upper body, cowboy shot, full body, close-up
- Angle: from above, from below, from side, from behind, dutch angle
- Focus: face focus, eye focus, depth of field

### Emphasis System
When something is particularly important or should be subtle, add it to the emphasis array:
- Weight > 1.0: Important elements (e.g., {"tag": "red eyes", "weight": 1.5})
- Weight < 1.0: Subtle/background elements (e.g., {"tag": "simple background", "weight": 0.7})
- Negative weight: Remove/avoid (V4.5 only) (e.g., {"tag": "text", "weight": -1})

Output the result using the output_scene_tags function.`;

/**
 * LLM 翻译结果接口
 */
export interface TranslationResult {
  /** 场景标签（不含 quality tags） */
  tags: string;
  /** 带强调标记的标签（使用统一语法 <tag:weight>） */
  tagsWithEmphasis: string;
}

/**
 * 将自然语言描述翻译为场景标签 (使用工具调用)
 * 不包含 quality/style tags，这些由预设系统处理
 */
export async function translateToTags(
  naturalLanguage: string
): Promise<TranslationResult> {
  logger.debug("Translating to tags", {
    input: naturalLanguage.substring(0, 100),
  });

  try {
    const response = await openai.chat.completions.create({
      model: config.llm.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: naturalLanguage },
      ],
      tools: [translateTagsTool],
      tool_choice: {
        type: "function",
        function: { name: "output_scene_tags" },
      },
      temperature: 0.7,
      max_tokens: 800,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "output_scene_tags") {
      throw new Error("Failed to get structured output from LLM");
    }

    const args = JSON.parse(toolCall.function.arguments) as {
      subject?: string;
      action?: string;
      scene?: string;
      composition?: string;
      emphasis?: Array<{ tag: string; weight: number }>;
    };

    // 组合基础标签
    const baseParts: string[] = [];

    if (args.subject) baseParts.push(args.subject.trim());
    if (args.action) baseParts.push(args.action.trim());
    if (args.scene) baseParts.push(args.scene.trim());
    if (args.composition) baseParts.push(args.composition.trim());

    const baseTags = baseParts.join(", ");

    // 处理强调标签
    let tagsWithEmphasis = baseTags;
    if (args.emphasis && args.emphasis.length > 0) {
      // 将强调标签转换为统一语法并替换/追加
      for (const emp of args.emphasis) {
        const emphasisTag = `<${emp.tag}:${emp.weight}>`;
        // 如果标签已存在于基础标签中，替换它
        const tagRegex = new RegExp(`\\b${escapeRegex(emp.tag)}\\b`, "gi");
        if (tagRegex.test(tagsWithEmphasis)) {
          tagsWithEmphasis = tagsWithEmphasis.replace(tagRegex, emphasisTag);
        } else {
          // 否则追加到末尾
          tagsWithEmphasis += `, ${emphasisTag}`;
        }
      }
    }

    logger.info("Translation successful", {
      input: naturalLanguage.substring(0, 50),
      output: baseTags.substring(0, 100),
    });

    return {
      tags: baseTags,
      tagsWithEmphasis,
    };
  } catch (error) {
    // 如果工具调用失败，回退到普通文本模式
    logger.warn("Tool call failed, falling back to text mode", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return translateToTagsFallback(naturalLanguage);
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 回退方案：普通文本模式翻译
 */
async function translateToTagsFallback(
  naturalLanguage: string
): Promise<TranslationResult> {
  const response = await openai.chat.completions.create({
    model: config.llm.model,
    messages: [
      {
        role: "system",
        content: `You are an expert AI image prompt translator. Convert natural language to NovelAI/Stable Diffusion style English tags.

IMPORTANT: Do NOT include quality tags (masterpiece, best quality, etc.) - these are handled separately.

Rules:
1. Output ONLY comma-separated English tags for the scene content
2. Use danbooru-style tags
3. Describe characters: count, hair, eyes, clothing, pose, expression
4. Describe scene: location, background, lighting, atmosphere
5. Describe composition: framing, camera angle
6. Keep tags concise and specific`,
      },
      { role: "user", content: naturalLanguage },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const result = response.choices[0]?.message?.content?.trim();

  if (!result) {
    throw new Error("Empty response from LLM");
  }

  logger.info("Fallback translation successful", {
    input: naturalLanguage.substring(0, 50),
    output: result.substring(0, 100),
  });

  return {
    tags: result,
    tagsWithEmphasis: result,
  };
}
