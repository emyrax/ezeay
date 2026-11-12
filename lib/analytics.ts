import { eventBus } from "./eventBus";

export type AnalyticsEvent =
  | "tutor_opened"
  | "tutor_message_sent"
  | "tutor_quiz_started"
  | "tutor_quiz_completed"
  | "tutor_plan_created"
  | "agent_opened"
  | "agent_message_sent";

export type AnalyticsProps = Record<string, string | number | boolean>;

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  ts: number;
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const payload: AnalyticsPayload = { event, props, ts: Date.now() };
  if (__DEV__) {
    console.debug("[analytics]", event, props ?? {});
  }
  eventBus.emit("analytics", payload);
  eventBus.emit(`analytics:${event}`, payload);
}
