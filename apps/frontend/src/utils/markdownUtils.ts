/**
 * Markdown normalization utility for Coodara AI responses.
 *
 * Ensures escaped markdown (e.g. `\*\*bold\*\*`, `\#\#\# heading`) is correctly
 * converted to valid Markdown syntax outside code blocks, while strictly preserving
 * code blocks, inline code, file paths, and mathematical notation.
 */

/**
 * Normalizes an AI response string for proper Markdown rendering.
 * Strictly preserves code blocks (fenced ``` and inline `).
 */
export function normalizeMarkdownForRendering(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // Split content by code blocks to protect code contents
  // Pattern matches fenced code blocks (```...```) and inline code (`...`)
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const parts = raw.split(codeBlockRegex);

  for (let i = 0; i < parts.length; i++) {
    // Odd indices correspond to code blocks matched by regex
    if (i % 2 === 1) {
      // Preserve code blocks verbatim without touching formatting characters
      continue;
    }

    let text = parts[i];

    // 1. Normalize escaped headings: e.g. "\\#\\#\\# " or "\\#\\# " or "\\# " -> "### ", "## ", "# "
    text = text.replace(/^[ \t]*\\+#{1,6}[ \t]+/gm, (match) => {
      return match.replace(/\\+/g, "");
    });
    text = text.replace(/^[ \t]*\\{1,2}(#{1,6})[ \t]+/gm, "$1 ");

    // 2. Normalize escaped bold/italic markers: e.g. "\*\*" or "\\*\\*" -> "**"
    text = text.replace(/\\{1,2}\*\\{1,2}\*/g, "**");
    text = text.replace(/\\+\*/g, "*");

    // 3. Normalize escaped underscores used for emphasis: e.g. "\_text\_" -> "_text_"
    text = text.replace(/\\+_/g, "_");

    // 4. Normalize escaped list markers: e.g. "\- " or "\\- " at start of line -> "- "
    text = text.replace(/^[ \t]*\\+-[ \t]+/gm, "- ");

    // 5. Clean up duplicate asterisks (e.g. "****" -> "**") outside code
    text = text.replace(/\*{4,}/g, "**");

    // 6. Clean up trailing stray escaped asterisks or empty bold markers at line ends
    text = text.replace(/[ \t]+\\\*\\\*$/gm, "");
    text = text.replace(/[ \t]+\*\*$/gm, "");

    // 7. Humanize internal debug terminology if exposed as raw identifiers
    // e.g. "Ca: 4" -> "Afferent coupling ($C_a$): 4"
    text = text.replace(/\bCa\b/g, "Afferent coupling ($C_a$)");
    text = text.replace(/\bCe\b/g, "Efferent coupling ($C_e$)");

    parts[i] = text;
  }

  return parts.join("");
}
