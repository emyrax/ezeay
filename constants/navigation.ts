import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type TabIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type TabHref = "/" | "/quests" | "/stats" | "/profile";

export interface TabItem {
  name: string;
  title: string;
  iconName: TabIconName;
  href: TabHref;
  accessibilityLabel: string;
}

export const TAB_ITEMS: TabItem[] = [
  {
    name: "index",
    title: "CAMP",
    iconName: "compass",
    href: "/",
    accessibilityLabel: "Navigate to Home Screen",
  },
  {
    name: "quests",
    title: "QUESTS",
    iconName: "sword-cross",
    href: "/quests",
    accessibilityLabel: "Navigate to Activity Log Screen",
  },
  {
    name: "stats",
    title: "EXPLORE",
    iconName: "compass-outline",
    href: "/stats",
    accessibilityLabel: "Navigate to Explore Courses Screen",
  },
  {
    name: "profile",
    title: "PROFILE",
    iconName: "account-circle",
    href: "/profile",
    accessibilityLabel: "Navigate to Gear and Settings Screen",
  },
];

export const NOTES_HREF = "/(notes)" as const;
