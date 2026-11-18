import { getExploreContentInset } from "../responsive";

export type ThreadTier = "xs" | "sm" | "md" | "lg";

const FALLBACK_WIDTH = 390;

function safeWidth(width: number): number {
  return Number.isFinite(width) && width > 0 ? width : FALLBACK_WIDTH;
}

export function getThreadTier(width: number): ThreadTier {
  const safe = safeWidth(width);
  if (safe < 360) return "xs";
  if (safe < 380) return "sm";
  if (safe < 640) return "md";
  return "lg";
}

const SHORT_HEIGHT = 640;

function isShortHeight(height: number): boolean {
  return Number.isFinite(height) && height > 0 && height < SHORT_HEIGHT;
}

export interface ThreadFeedChrome {
  tier: ThreadTier;
  compact: boolean;
  showSubtitle: boolean;
  gutter: number;
  titleSize: number;
  titleCollapsed: number;
  subtitleSize: number;
  composeSize: number;
  composeIcon: number;
  headerPadTop: number;
  headerPadBottom: number;
  headerPadTopCollapsed: number;
  headerPadBottomCollapsed: number;
  headerGap: number;
  chipHeight: number;
  chipFont: number;
  chipPad: number;
  tabHeight: number;
  tabFont: number;
  tabPad: number;
  tabGap: number;
  tabPadTop: number;
  tabPadBottom: number;
  listTop: number;
  listBottomGap: number;
  emptyPadH: number;
  mascotHeight: number;
  skeletonPadding: number;
}

type FeedChromeSizes = Omit<
  ThreadFeedChrome,
  "tier" | "compact" | "showSubtitle" | "gutter"
>;

const FEED_CHROME: Record<ThreadTier, FeedChromeSizes> = {
  xs: {
    titleSize: 20,
    titleCollapsed: 17,
    subtitleSize: 11,
    composeSize: 36,
    composeIcon: 20,
    headerPadTop: 10,
    headerPadBottom: 8,
    headerPadTopCollapsed: 8,
    headerPadBottomCollapsed: 6,
    headerGap: 8,
    chipHeight: 30,
    chipFont: 10,
    chipPad: 9,
    tabHeight: 30,
    tabFont: 10,
    tabPad: 9,
    tabGap: 6,
    tabPadTop: 8,
    tabPadBottom: 4,
    listTop: 8,
    listBottomGap: 16,
    emptyPadH: 20,
    mascotHeight: 96,
    skeletonPadding: 12,
  },
  sm: {
    titleSize: 22,
    titleCollapsed: 18,
    subtitleSize: 12,
    composeSize: 40,
    composeIcon: 21,
    headerPadTop: 12,
    headerPadBottom: 8,
    headerPadTopCollapsed: 8,
    headerPadBottomCollapsed: 6,
    headerGap: 10,
    chipHeight: 32,
    chipFont: 11,
    chipPad: 10,
    tabHeight: 32,
    tabFont: 11,
    tabPad: 10,
    tabGap: 6,
    tabPadTop: 10,
    tabPadBottom: 5,
    listTop: 10,
    listBottomGap: 20,
    emptyPadH: 24,
    mascotHeight: 110,
    skeletonPadding: 14,
  },
  md: {
    titleSize: 26,
    titleCollapsed: 20,
    subtitleSize: 13,
    composeSize: 44,
    composeIcon: 22,
    headerPadTop: 16,
    headerPadBottom: 10,
    headerPadTopCollapsed: 10,
    headerPadBottomCollapsed: 8,
    headerGap: 12,
    chipHeight: 34,
    chipFont: 12,
    chipPad: 14,
    tabHeight: 34,
    tabFont: 12,
    tabPad: 15,
    tabGap: 8,
    tabPadTop: 12,
    tabPadBottom: 6,
    listTop: 12,
    listBottomGap: 24,
    emptyPadH: 32,
    mascotHeight: 124,
    skeletonPadding: 16,
  },
  lg: {
    titleSize: 26,
    titleCollapsed: 20,
    subtitleSize: 13,
    composeSize: 44,
    composeIcon: 22,
    headerPadTop: 16,
    headerPadBottom: 10,
    headerPadTopCollapsed: 10,
    headerPadBottomCollapsed: 8,
    headerGap: 12,
    chipHeight: 34,
    chipFont: 12,
    chipPad: 14,
    tabHeight: 34,
    tabFont: 12,
    tabPad: 15,
    tabGap: 8,
    tabPadTop: 12,
    tabPadBottom: 6,
    listTop: 12,
    listBottomGap: 24,
    emptyPadH: 32,
    mascotHeight: 124,
    skeletonPadding: 16,
  },
};

export function getThreadFeedChrome(
  width: number,
  height = Number.POSITIVE_INFINITY,
): ThreadFeedChrome {
  const safe = safeWidth(width);
  const tier = getThreadTier(safe);
  const base = FEED_CHROME[tier];
  const short = isShortHeight(height);
  return {
    tier,
    compact: safe < 380,
    gutter: getExploreContentInset(safe),
    ...base,
    showSubtitle: !short,
    ...(short
      ? {
          headerPadTop: Math.max(6, base.headerPadTop - 4),
          headerPadBottom: Math.max(4, base.headerPadBottom - 3),
          tabPadTop: Math.max(4, base.tabPadTop - 4),
          tabPadBottom: Math.max(3, base.tabPadBottom - 2),
          listTop: Math.max(4, base.listTop - 4),
        }
      : {}),
  };
}

export interface ThreadCardMetrics {
  tier: ThreadTier;
  compact: boolean;
  padding: number;
  radius: number;
  avatar: number;
  headerGap: number;
  nameFont: number;
  badgeFont: number;
  metaFont: number;
  showExamBadge: boolean;
  followHeight: number;
  followPad: number;
  followFont: number;
  breadcrumbPadV: number;
  breadcrumbPadH: number;
  breadcrumbMarginTop: number;
  breadcrumbFont: number;
  breadcrumbSubFont: number;
  moduleFont: number;
  iconSize: number;
  titleFont: number;
  contentFont: number;
  contentLine: number;
  imageAspectRatio: number;
  imageMaxHeight: number;
  studyHeight: number;
  studyPad: number;
  studyFont: number;
  studyIcon: number;
  studyGap: number;
  actionHeight: number;
  actionFont: number;
  actionIcon: number;
  actionGap: number;
  actionPad: number;
  showActionLabels: boolean;
  cardBottom: number;
}

type CardSizes = Omit<ThreadCardMetrics, "tier" | "compact">;

const CARD_METRICS: Record<ThreadTier, CardSizes> = {
  xs: {
    padding: 10,
    radius: 14,
    avatar: 34,
    headerGap: 8,
    nameFont: 13,
    badgeFont: 9,
    metaFont: 10,
    showExamBadge: false,
    followHeight: 28,
    followPad: 8,
    followFont: 10,
    breadcrumbPadV: 5,
    breadcrumbPadH: 8,
    breadcrumbMarginTop: 10,
    breadcrumbFont: 11,
    breadcrumbSubFont: 9,
    moduleFont: 8,
    iconSize: 12,
    titleFont: 15,
    contentFont: 13,
    contentLine: 19,
    imageAspectRatio: 16 / 9,
    imageMaxHeight: 130,
    studyHeight: 30,
    studyPad: 8,
    studyFont: 10,
    studyIcon: 15,
    studyGap: 6,
    actionHeight: 30,
    actionFont: 10,
    actionIcon: 17,
    actionGap: 3,
    actionPad: 3,
    showActionLabels: false,
    cardBottom: 8,
  },
  sm: {
    padding: 12,
    radius: 16,
    avatar: 38,
    headerGap: 9,
    nameFont: 14,
    badgeFont: 9,
    metaFont: 11,
    showExamBadge: false,
    followHeight: 30,
    followPad: 10,
    followFont: 11,
    breadcrumbPadV: 6,
    breadcrumbPadH: 8,
    breadcrumbMarginTop: 10,
    breadcrumbFont: 11,
    breadcrumbSubFont: 9,
    moduleFont: 8,
    iconSize: 13,
    titleFont: 15,
    contentFont: 14,
    contentLine: 20,
    imageAspectRatio: 16 / 9,
    imageMaxHeight: 145,
    studyHeight: 32,
    studyPad: 9,
    studyFont: 11,
    studyIcon: 16,
    studyGap: 7,
    actionHeight: 32,
    actionFont: 11,
    actionIcon: 18,
    actionGap: 4,
    actionPad: 4,
    showActionLabels: false,
    cardBottom: 10,
  },
  md: {
    padding: 14,
    radius: 18,
    avatar: 42,
    headerGap: 10,
    nameFont: 15,
    badgeFont: 10,
    metaFont: 12,
    showExamBadge: true,
    followHeight: 34,
    followPad: 12,
    followFont: 12,
    breadcrumbPadV: 7,
    breadcrumbPadH: 10,
    breadcrumbMarginTop: 12,
    breadcrumbFont: 12,
    breadcrumbSubFont: 10,
    moduleFont: 9,
    iconSize: 14,
    titleFont: 16,
    contentFont: 14,
    contentLine: 20,
    imageAspectRatio: 16 / 9,
    imageMaxHeight: 170,
    studyHeight: 36,
    studyPad: 11,
    studyFont: 12,
    studyIcon: 17,
    studyGap: 8,
    actionHeight: 36,
    actionFont: 12,
    actionIcon: 19,
    actionGap: 5,
    actionPad: 6,
    showActionLabels: true,
    cardBottom: 12,
  },
  lg: {
    padding: 14,
    radius: 18,
    avatar: 42,
    headerGap: 10,
    nameFont: 15,
    badgeFont: 10,
    metaFont: 12,
    showExamBadge: true,
    followHeight: 34,
    followPad: 12,
    followFont: 12,
    breadcrumbPadV: 7,
    breadcrumbPadH: 10,
    breadcrumbMarginTop: 12,
    breadcrumbFont: 12,
    breadcrumbSubFont: 10,
    moduleFont: 9,
    iconSize: 14,
    titleFont: 16,
    contentFont: 14,
    contentLine: 20,
    imageAspectRatio: 16 / 9,
    imageMaxHeight: 170,
    studyHeight: 36,
    studyPad: 11,
    studyFont: 12,
    studyIcon: 17,
    studyGap: 8,
    actionHeight: 36,
    actionFont: 12,
    actionIcon: 19,
    actionGap: 5,
    actionPad: 6,
    showActionLabels: true,
    cardBottom: 12,
  },
};

export function getThreadCardMetrics(width: number): ThreadCardMetrics {
  const safe = safeWidth(width);
  const tier = getThreadTier(safe);
  return {
    tier,
    compact: safe < 380,
    ...CARD_METRICS[tier],
  };
}
