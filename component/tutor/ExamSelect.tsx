import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  ALL_EXAMS_VALUE,
  EXAM_OPTIONS,
  OTHER_EXAM_VALUE,
  isPresetExam,
} from "../../data/exams";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import DropdownSelect from "../DropdownSelect";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ExamSelect({ value, onChange }: Props) {
  const theme = useThemeColors();
  const custom = !isPresetExam(value) && value.trim().length > 0;
  const [otherMode, setOtherMode] = useState(custom);
  const showCustomInput = otherMode || custom;
  const selected = showCustomInput
    ? OTHER_EXAM_VALUE
    : isPresetExam(value)
      ? value
      : ALL_EXAMS_VALUE;

  useEffect(() => {
    if (isPresetExam(value)) setOtherMode(false);
  }, [value]);

  const selectExam = (next: string) => {
    if (next === OTHER_EXAM_VALUE) {
      setOtherMode(true);
      if (isPresetExam(value)) onChange("");
      return;
    }
    setOtherMode(false);
    onChange(next);
  };

  return (
    <View style={styles.wrapper}>
      <DropdownSelect
        options={EXAM_OPTIONS}
        selected={selected}
        onSelect={selectExam}
        placeholder="All exams"
        title="Select exam"
      />
      {showCustomInput ? (
        <TextInput
          value={isPresetExam(value) ? "" : value}
          onChangeText={(text) => {
            setOtherMode(true);
            onChange(text.slice(0, 40));
          }}
          placeholder="Enter exam or curriculum"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.borderLight,
              color: theme.text,
            },
          ]}
          maxLength={40}
          autoCapitalize="words"
          accessibilityLabel="Custom exam or curriculum"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontFamily,
    fontSize: 13,
  },
});
