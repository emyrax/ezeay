import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useThemeColors } from "../../hooks/useTheme";
import { bodyFont, ThemeColors } from "../../constants/themes";
import ThemeIcon from "./ThemeIcon";
import {
  FormatTool,
  TextRange,
  getActiveTools,
  parseMarkdownRuns,
  toggleMarkdown,
} from "../../lib/notes/formatting";

const FONT_SIZE = 17;
const LINE_HEIGHT = 28;
const MAX_HISTORY = 100;
const COALESCE_MS = 600;
const MONO_FONT = Platform.select({ ios: "Menlo", android: "monospace" });
const HIGHLIGHT_BG = "rgba(255, 213, 0, 0.55)";
const INPUT_SELECTION_OPACITY = 0.2;
const DEFAULT_HEADING_COLOR = "#38BDF8";

const HEADING_GROUP_COLORS: Record<string, keyof ThemeColors> = {
  summary: "primary",
  cheatsheet: "accent",
  flashcards: "success",
  quiz: "warning",
};

const idleCallback = (cb: () => void) => {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
};

export const HELP_LINES = [
  "Tap a word to place the cursor",
  "Double-tap a word to select it",
  "Select / Cut / Copy / Paste live in the bubble",
  "Style tools (B, I, U, H1, H2) sit fixed above the action bar",
  "Highlight marks text yellow",
];

interface Snapshot {
  value: string;
  selection: TextRange;
}

export interface EditorToolbarState {
  activeTools: Record<FormatTool, boolean> | null;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export interface RichTextEditorHandle {
  applyFormat: (tool: FormatTool) => void;
  undo: () => void;
  redo: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  onTagInput?: (text: string) => void;
  onSelectionChange?: (selection: TextRange) => void;
  onKeyPress?: (e: { nativeEvent: { key: string } }) => void;
  onToolbarStateChange?: (state: EditorToolbarState) => void;
  enabled?: boolean;
  keyboardVisible?: boolean;
  placeholder?: string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      value,
      onChange,
      onTagInput,
      onSelectionChange,
      onKeyPress,
      onToolbarStateChange,
      enabled = true,
      keyboardVisible = true,
      placeholder,
    },
    ref,
  ) {
    const theme = useThemeColors();

    const inputRef = useRef<TextInput>(null);
    const selectionRef = useRef<TextRange>({ start: 0, end: 0 });
    const historyRef = useRef<Snapshot[]>([]);
    const futureRef = useRef<Snapshot[]>([]);
    const lastValueRef = useRef(value);
    const lastPushTimeRef = useRef(0);
    const coalesceRef = useRef(false);
    const applyingHistoryRef = useRef(false);
    const pendingSnapshotSelectionRef = useRef<TextRange | null>(null);

    const [focused, setFocused] = useState(false);
    const [selection, setSelection] = useState<TextRange>({ start: 0, end: 0 });
    const [containerHeight, setContainerHeight] = useState(0);
    const [anchorY, setAnchorY] = useState(0);
    const bubbleAnim = useRef(new Animated.Value(0)).current;

    const sel = selection;
    const hasSelection = sel.start !== sel.end;
    const canUndo = historyRef.current.length > 0;
    const canRedo = futureRef.current.length > 0;
    const bubbleVisible =
      focused &&
      enabled &&
      (hasSelection || (keyboardVisible && (canUndo || canRedo)));

    const updateSelection = (next: TextRange) => {
      selectionRef.current = next;
      setSelection(next);
      onSelectionChange?.(next);
    };

    useEffect(() => {
      if (bubbleVisible) {
        Animated.spring(bubbleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 280,
          mass: 0.8,
        }).start();
      } else {
        bubbleAnim.setValue(0);
      }
    }, [bubbleVisible, bubbleAnim]);

    useEffect(() => {
      const prev = lastValueRef.current;
      if (prev === value) return;
      lastValueRef.current = value;

      if (applyingHistoryRef.current) {
        applyingHistoryRef.current = false;
        return;
      }

      const now = Date.now();
      const coalescing =
        coalesceRef.current &&
        historyRef.current.length > 0 &&
        now - lastPushTimeRef.current < COALESCE_MS;
      if (!coalescing) {
        historyRef.current.push({
          value: prev,
          selection:
            pendingSnapshotSelectionRef.current ?? { ...selectionRef.current },
        });
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        lastPushTimeRef.current = now;
      }
      pendingSnapshotSelectionRef.current = null;
      coalesceRef.current = false;
      futureRef.current = [];
    }, [value]);

    const scheduleSetSelection = (sel: TextRange) => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      idleCallback(() => {
        try {
          inputRef.current?.setSelection(sel.start, sel.end);
        } catch {}
        setTimeout(() => {
          try {
            inputRef.current?.setSelection(sel.start, sel.end);
          } catch {}
        }, 100);
      });
    };

    const applyHistory = (next: Snapshot) => {
      applyingHistoryRef.current = true;
      selectionRef.current = { ...next.selection };
      onChange(next.value);
      scheduleSetSelection(next.selection);
    };

    const undo = () => {
      if (historyRef.current.length === 0) return;
      const entry = historyRef.current[historyRef.current.length - 1];
      historyRef.current.pop();
      futureRef.current.push({
        value: lastValueRef.current,
        selection: { ...selectionRef.current },
      });
      applyHistory(entry);
    };

    const redo = () => {
      if (futureRef.current.length === 0) return;
      const entry = futureRef.current[futureRef.current.length - 1];
      futureRef.current.pop();
      historyRef.current.push({
        value: lastValueRef.current,
        selection: { ...selectionRef.current },
      });
      applyHistory(entry);
    };

    const applyFormat = (tool: FormatTool) => {
      const sel = selectionRef.current;
      if (sel.start === sel.end) return;
      const res = toggleMarkdown(value, sel, tool);
      if (!res) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      coalesceRef.current = false;
      pendingSnapshotSelectionRef.current = { start: sel.start, end: sel.end };
      selectionRef.current = { start: res.start, end: res.end };
      onChange(res.content);
      scheduleSetSelection({ start: res.start, end: res.end });
    };

    const selectWord = () => {
      const text = value;
      if (!text) return;
      const pos = Math.min(sel.start, sel.end);
      const isWordChar = (ch: string) => /[\p{L}\p{N}_]/u.test(ch);
      let start = pos;
      let end = pos;
      if (!isWordChar(text[pos] ?? "")) {
        const next = /[\p{L}\p{N}_]/u.exec(text.slice(pos));
        if (!next) return;
        start = pos + next.index;
        end = start;
      }
      while (start > 0 && isWordChar(text[start - 1])) start--;
      while (end < text.length && isWordChar(text[end])) end++;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      updateSelection({ start, end });
      scheduleSetSelection({ start, end });
    };

    const selectAll = () => {
      if (!value) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      updateSelection({ start: 0, end: value.length });
      scheduleSetSelection({ start: 0, end: value.length });
    };

    const copySelection = async () => {
      const start = Math.min(sel.start, sel.end);
      const end = Math.max(sel.start, sel.end);
      if (start === end) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Clipboard.setStringAsync(value.slice(start, end));
    };

    const cutSelection = async () => {
      const start = Math.min(sel.start, sel.end);
      const end = Math.max(sel.start, sel.end);
      if (start === end) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Clipboard.setStringAsync(value.slice(start, end));
      coalesceRef.current = false;
      pendingSnapshotSelectionRef.current = { start, end };
      updateSelection({ start, end: start });
      const next = value.slice(0, start) + value.slice(end);
      onChange(next);
      scheduleSetSelection({ start, end: start });
    };

    const pasteSelection = async () => {
      const start = Math.min(sel.start, sel.end);
      const end = Math.max(sel.start, sel.end);
      let clip = "";
      try {
        clip = (await Clipboard.getStringAsync()) ?? "";
      } catch {
        return;
      }
      if (!clip) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      coalesceRef.current = false;
      pendingSnapshotSelectionRef.current = { start, end };
      const caret = start + clip.length;
      updateSelection({ start: caret, end: caret });
      onChange(value.slice(0, start) + clip + value.slice(end));
      scheduleSetSelection({ start: caret, end: caret });
    };

    const overlayRuns = useMemo(() => parseMarkdownRuns(value), [value]);

    const runStyle = (run: (typeof overlayRuns)[number]) => {
      const s: object[] = [];
      if (run.heading === 1) s.push(styles.runHeading1);
      else if (run.heading === 2) s.push(styles.runHeading2);
      if (run.heading) {
        if (run.headingGroup) {
          const key = HEADING_GROUP_COLORS[run.headingGroup];
          if (key) {
            s.push({ color: theme[key], backgroundColor: theme[key] + "1A" });
          }
        }
        if (run.bold) s.push(styles.runBold);
        if (run.italic) s.push(styles.runItalic);
        if (run.underline) s.push(styles.runUnderline);
      }
      if (run.checkbox === true) s.push({ color: theme.primary });
      else if (run.checkbox === false) s.push({ color: theme.textSecondary });
      else if (run.bullet) s.push({ color: theme.primary });
      if (run.code) s.push(styles.runCode);
      if (run.highlight) s.push({ backgroundColor: HIGHLIGHT_BG });
      if (!run.heading) {
        if (run.bold) s.push(styles.runBold);
        if (run.italic) s.push(styles.runItalic);
        if (run.underline) s.push(styles.runUnderline);
      }
      return s;
    };

    const activeTools = useMemo(
      () => (hasSelection ? getActiveTools(value, sel) : null),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [value, sel.start, sel.end, hasSelection],
    );

    useEffect(() => {
      onToolbarStateChange?.({
        activeTools,
        canUndo,
        canRedo,
        hasSelection,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onToolbarStateChange, activeTools, canUndo, canRedo, hasSelection]);

    useImperativeHandle(
      ref,
      () => ({ applyFormat, undo, redo }),
      [applyFormat, undo, redo],
    );

    const anchor = hasSelection ? sel.end : sel.start;
    const placeAbove = anchorY > 64;

    return (
      <View
        style={styles.wrapper}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, hasSelection && styles.inputSelected]}
          cursorColor={theme.text}
          selectionColor={theme.primary}
          contextMenuHidden={Platform.OS === "android"}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          value={value}
          multiline
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSelectionChange={(e) => {
            const nativeSel = e.nativeEvent.selection;
            updateSelection({ start: nativeSel.start, end: nativeSel.end });
          }}
          onChangeText={(text) => {
            coalesceRef.current = true;
            onChange(text);
            onTagInput?.(text);
          }}
          onKeyPress={onKeyPress}
        />

        <Text pointerEvents="none" style={[styles.overlay, { color: theme.text }]}>
          {overlayRuns.map((run, i) => (
            <Text key={i} style={runStyle(run)}>
              {run.text}
            </Text>
          ))}
        </Text>

        <Text
          pointerEvents="none"
          style={[styles.measurer, { color: theme.text }]}
          onLayout={(e) => setAnchorY(e.nativeEvent.layout.height)}
        >
          {value.slice(0, anchor)}
        </Text>

        {bubbleVisible && (
          <Animated.View
            style={[
              styles.bubble,
              placeAbove
                ? { bottom: containerHeight - anchorY + 10 }
                : { top: anchorY + LINE_HEIGHT + 8 },
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderLight,
                transform: [
                  { scale: bubbleAnim },
                  { translateY: Animated.multiply(bubbleAnim, -4) },
                ],
                opacity: bubbleAnim,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.bubbleContent}
            >
              <Pressable
                onPress={undo}
                accessibilityLabel="Undo"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.toolPressed]}
              >
                <ThemeIcon
                  sf="arrow.uturn.backward"
                  material="undo"
                  size={24}
                  color={canUndo ? theme.text : theme.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={redo}
                accessibilityLabel="Redo"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.toolPressed]}
              >
                <ThemeIcon
                  sf="arrow.uturn.forward"
                  material="redo"
                  size={24}
                  color={canRedo ? theme.text : theme.textMuted}
                />
              </Pressable>

              <View style={[styles.bubbleDivider, { backgroundColor: theme.borderLight }]} />

              <Pressable
                onPress={selectWord}
                accessibilityLabel="Select word"
                style={({ pressed }) => [styles.labelBtn, pressed && styles.toolPressed]}
              >
                <Text style={[styles.labelChar, { color: theme.text }]}>Select</Text>
              </Pressable>
              <Pressable
                onPress={selectAll}
                accessibilityLabel="Select all"
                style={({ pressed }) => [
                  styles.labelBtn,
                  !value.length && styles.toolDim,
                  pressed && styles.toolPressed,
                ]}
              >
                <Text style={[styles.labelChar, { color: theme.text }]}>All</Text>
              </Pressable>
              <Pressable
                onPress={cutSelection}
                accessibilityLabel="Cut"
                style={({ pressed }) => [
                  styles.labelBtn,
                  !hasSelection && styles.toolDim,
                  pressed && styles.toolPressed,
                ]}
              >
                <Text style={[styles.labelChar, { color: theme.text }]}>Cut</Text>
              </Pressable>
              <Pressable
                onPress={copySelection}
                accessibilityLabel="Copy"
                style={({ pressed }) => [
                  styles.labelBtn,
                  !hasSelection && styles.toolDim,
                  pressed && styles.toolPressed,
                ]}
              >
                <Text style={[styles.labelChar, { color: theme.text }]}>Copy</Text>
              </Pressable>
              <Pressable
                onPress={pasteSelection}
                accessibilityLabel="Paste"
                style={({ pressed }) => [styles.labelBtn, pressed && styles.toolPressed]}
              >
                <Text style={[styles.labelChar, { color: theme.text }]}>Paste</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 200,
  },
  input: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    minHeight: 200,
    padding: 0,
    fontFamily: bodyFont,
    color: "transparent",
  },
  inputSelected: {
    opacity: INPUT_SELECTION_OPACITY,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: bodyFont,
    color: "transparent",
  },
  measurer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: bodyFont,
  },
  runBold: { fontWeight: "700" },
  runItalic: { fontStyle: "italic" },
  runUnderline: { textDecorationLine: "underline" },
  runCode: {
    fontFamily: MONO_FONT,
    fontSize: FONT_SIZE - 2,
    lineHeight: LINE_HEIGHT,
  },
  runHeading1: {
    fontSize: 19,
    fontWeight: "800",
    color: DEFAULT_HEADING_COLOR,
  },
  runHeading2: {
    fontWeight: "700",
    color: DEFAULT_HEADING_COLOR,
  },
  bubble: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
  },
  bubbleContent: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bubbleDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  iconBtn: {
    minWidth: 46,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  labelBtn: {
    minWidth: 46,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    paddingHorizontal: 8,
  },
  labelChar: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  toolDim: { opacity: 0.35 },
  toolPressed: { opacity: 0.5 },
});

export default RichTextEditor;