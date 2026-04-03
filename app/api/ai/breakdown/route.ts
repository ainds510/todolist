import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

type BreakdownItem = {
  title: string;
  priority: "high" | "medium" | "low";
};

const SYSTEM_INSTRUCTION =
  "你是一个理性的任务规划专家。请将用户目标拆解为 4 条具体的待办事项。";

const ALLOWED_PRIORITIES = new Set<BreakdownItem["priority"]>([
  "high",
  "medium",
  "low",
]);

function normalizeItems(value: unknown): BreakdownItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { title, priority } = item as {
        title?: unknown;
        priority?: unknown;
      };

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof priority !== "string" ||
        !ALLOWED_PRIORITIES.has(priority as BreakdownItem["priority"])
      ) {
        return null;
      }

      return {
        title: title.trim(),
        priority: priority as BreakdownItem["priority"],
      };
    })
    .filter((item): item is BreakdownItem => item !== null);

  if (items.length !== 4) {
    return null;
  }

  return items;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const goal =
      typeof body?.goal === "string"
        ? body.goal.trim()
        : typeof body?.input === "string"
          ? body.input.trim()
          : "";

    if (!goal) {
      return NextResponse.json(
        { error: "Request body must include a non-empty goal string." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                `用户目标：${goal}`,
                '请严格只返回 JSON 数组，不要返回 Markdown 代码块，也不要返回任何额外说明。',
                '返回格式必须是：[{"title":"任务名称","priority":"high/medium/low"}, ...]',
                "必须恰好返回 4 条任务。",
              ].join("\n"),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const rawText = result.response.text().trim();
    const parsed = JSON.parse(rawText) as unknown;
    const items = normalizeItems(parsed);

    if (!items) {
      return NextResponse.json(
        { error: "Model returned an invalid breakdown format." },
        { status: 502 }
      );
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Breakdown API error:", error);

    return NextResponse.json(
      { error: "Failed to generate task breakdown." },
      { status: 500 }
    );
  }
}
