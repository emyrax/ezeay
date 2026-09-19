import type { JSONSchema } from "expo-ai-kit";

export function shapeToSchema(shape: unknown, root = true): JSONSchema {
  if (typeof shape === "string") return { type: "string" };
  if (typeof shape === "number") return { type: "integer" };
  if (Array.isArray(shape)) {
    const itemSchema = shape.length > 0 ? shapeToSchema(shape[0], false) : ({ type: "string" } as JSONSchema);
    return { type: "array", items: itemSchema };
  }
  if (shape && typeof shape === "object") {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = shapeToSchema(value, false);
      required.push(key);
    }
    return { type: "object", properties, required };
  }
  return root ? { type: "object" } : ({ type: "string" } as JSONSchema);
}