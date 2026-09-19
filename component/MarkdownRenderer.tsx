import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ThemeColors } from "../constants/themes";

interface Props {
  content: string;
  theme: ThemeColors;
  numberOfLines?: number;
}

type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string };

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    if (match[1]) nodes.push({ type: "bold", text: match[2] });
    else if (match[3]) nodes.push({ type: "italic", text: match[4] });
    else if (match[5]) nodes.push({ type: "code", text: match[6] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }
  return nodes;
}

function renderInlineNodes(nodes: InlineNode[], theme: ThemeColors, keyPrefix: string) {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}_${i}`;
    switch (node.type) {
      case "bold":
        return <Text key={key} style={{ fontWeight: "700" }}>{node.text}</Text>;
      case "italic":
        return <Text key={key} style={{ fontStyle: "italic" }}>{node.text}</Text>;
      case "code":
        return (
          <Text key={key} style={[styles.codeInline, { backgroundColor: theme.surfaceAlt, color: theme.primary }]}>
            {node.text}
          </Text>
        );
      default:
        return <Text key={key}>{node.text}</Text>;
    }
  });
}

function MarkdownRenderer({ content, theme, numberOfLines }: Props) {
  const elements = useMemo(() => {
    const lines = content.split("\n");
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const key = `l${i}`;

      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          result.push(
            <View key={key} style={[styles.codeBlock, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.codeBlockText, { color: theme.text }]}>{codeBlockLines.join("\n")}</Text>
            </View>,
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (line.trim() === "") {
        result.push(<View key={key} style={styles.paragraphBreak} />);
        continue;
      }

      if (line.trim().startsWith("---")) {
        result.push(
          <View key={key} style={[styles.hr, { backgroundColor: theme.borderLight }]} />,
        );
        continue;
      }

      if (line.trim().startsWith("###### ")) {
        const text = line.trim().slice(7);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h6, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      if (line.trim().startsWith("##### ")) {
        const text = line.trim().slice(6);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h5, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      if (line.trim().startsWith("#### ")) {
        const text = line.trim().slice(5);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h4, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      if (line.trim().startsWith("### ")) {
        const text = line.trim().slice(4);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h3, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      if (line.trim().startsWith("## ")) {
        const text = line.trim().slice(3);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h2, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      if (line.trim().startsWith("# ")) {
        const text = line.trim().slice(2);
        const nodes = parseInline(text);
        result.push(
          <Text key={key} style={[styles.h1, { color: theme.text }]} numberOfLines={numberOfLines}>
            {renderInlineNodes(nodes, theme, key)}
          </Text>,
        );
        continue;
      }

      const trimmedLine = line.trim();

      const checkboxMatch = trimmedLine.match(/^-?\s*\[\s*(\s|x|X)?\s*\]\s*/);
      if (checkboxMatch) {
        const checked = checkboxMatch[1] && ["x", "X"].includes(checkboxMatch[1]);
        const rest = trimmedLine.slice(checkboxMatch[0].length);
        const nodes = parseInline(rest);
        const checkbox = checked ? "☑" : "☐";
        result.push(
          <View key={key} style={styles.checkboxLine}>
            <Text style={[styles.checkboxChar, { color: checked ? theme.primary : theme.textMuted }]}>
              {checkbox}
            </Text>
            <Text style={[styles.paragraph, { color: theme.text, textDecorationLine: checked ? "line-through" : "none" }]}>
              {renderInlineNodes(nodes, theme, key)}
            </Text>
          </View>,
        );
        continue;
      }

      const bulletMatch = trimmedLine.match(/^[-*]\s+/);
      if (bulletMatch) {
        const rest = trimmedLine.slice(bulletMatch[0].length);
        const nodes = parseInline(rest);
        result.push(
          <View key={key} style={styles.bulletLine}>
            <Text style={[styles.bullet, { color: theme.textMuted }]}>{"\u2022"}</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              {renderInlineNodes(nodes, theme, key)}
            </Text>
          </View>,
        );
        continue;
      }

      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+/);
      if (numberedMatch) {
        const rest = trimmedLine.slice(numberedMatch[0].length);
        const nodes = parseInline(rest);
        result.push(
          <View key={key} style={styles.bulletLine}>
            <Text style={[styles.number, { color: theme.textMuted }]}>{numberedMatch[1]}.</Text>
            <Text style={[styles.paragraph, { color: theme.text }]}>
              {renderInlineNodes(nodes, theme, key)}
            </Text>
          </View>,
        );
        continue;
      }

      const nodes = parseInline(line);
      result.push(
        <Text key={key} style={[styles.paragraph, { color: theme.text }]} numberOfLines={numberOfLines}>
          {renderInlineNodes(nodes, theme, key)}
        </Text>,
      );
    }

    if (inCodeBlock && codeBlockLines.length > 0) {
      result.push(
        <View key="code_remain" style={[styles.codeBlock, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.codeBlockText, { color: theme.text }]}>{codeBlockLines.join("\n")}</Text>
        </View>,
      );
    }

    return result;
  }, [content, theme, numberOfLines]);

  return <>{elements}</>;
}

const styles = StyleSheet.create({
  paragraph: { fontSize: 15, lineHeight: 22 },
  paragraphBreak: { height: 8 },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 4, marginTop: 8 },
  h2: { fontSize: 20, fontWeight: "700", marginBottom: 3, marginTop: 6 },
  h3: { fontSize: 18, fontWeight: "700", marginBottom: 2, marginTop: 4 },
  h4: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  h5: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  h6: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  codeInline: { fontFamily: "monospace", fontSize: 13, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  codeBlock: { borderRadius: 10, padding: 12, marginVertical: 6 },
  codeBlockText: { fontFamily: "monospace", fontSize: 13, lineHeight: 19 },
  hr: { height: 1, marginVertical: 10 },
  bulletLine: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  bullet: { fontSize: 15, lineHeight: 22, marginRight: 6, width: 12, textAlign: "center" },
  number: { fontSize: 15, lineHeight: 22, marginRight: 6, minWidth: 20, textAlign: "right" },
  checkboxLine: { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  checkboxChar: { fontSize: 15, lineHeight: 22, marginRight: 6, width: 16, textAlign: "center" },
});

export default MarkdownRenderer;
