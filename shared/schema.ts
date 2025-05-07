import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Tracks table
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // audio, midi, automation
  color: text("color").default("#FF7A00"),
  isMuted: boolean("is_muted").default(false),
  isSoloed: boolean("is_soloed").default(false),
  isArmed: boolean("is_armed").default(false),
  isAI: boolean("is_ai").default(false),
  volume: integer("volume").default(0), // Volume in dB (-80 to +6)
  pan: integer("pan").default(0), // Pan (-100 to +100)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  projectId: integer("project_id").notNull(),
});

// Clips table
export const clips = pgTable("clips", {
  id: serial("id").primaryKey(),
  name: text("name"),
  trackId: integer("track_id").notNull().references(() => tracks.id),
  startTime: integer("start_time").notNull(), // In samples
  duration: integer("duration").notNull(), // In samples
  audioData: text("audio_data"), // URL to audio data
  waveformData: jsonb("waveform_data"), // Precomputed waveform data for rendering
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tempo: integer("tempo").default(120),
  timeSignature: text("time_signature").default("4/4"),
  sampleRate: integer("sample_rate").default(44100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Bot suggestions
export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  botType: text("bot_type").notNull(), // mixbot, masteringbot, etc.
  suggestion: text("suggestion").notNull(),
  trackId: integer("track_id").references(() => tracks.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  isApplied: boolean("is_applied").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sound library samples
export const samples = pgTable("samples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // drums, bass, synth, etc.
  tempo: integer("tempo"),
  key: text("key"),
  audioUrl: text("audio_url").notNull(),
  waveformData: jsonb("waveform_data"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const tracksRelations = relations(tracks, ({ many, one }) => ({
  clips: many(clips),
  project: one(projects, {
    fields: [tracks.projectId],
    references: [projects.id],
  }),
}));

export const clipsRelations = relations(clips, ({ one }) => ({
  track: one(tracks, {
    fields: [clips.trackId],
    references: [tracks.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tracks: many(tracks),
  aiSuggestions: many(aiSuggestions),
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  project: one(projects, {
    fields: [aiSuggestions.projectId],
    references: [projects.id],
  }),
  track: one(tracks, {
    fields: [aiSuggestions.trackId],
    references: [tracks.id],
  }),
}));

// Zod Schemas for validation
export const trackInsertSchema = createInsertSchema(tracks, {
  name: (schema) => schema.min(1, "Track name is required"),
  type: (schema) => schema.min(1, "Track type is required"),
});
export type TrackInsert = z.infer<typeof trackInsertSchema>;
export type Track = typeof tracks.$inferSelect;

export const clipInsertSchema = createInsertSchema(clips);
export type ClipInsert = z.infer<typeof clipInsertSchema>;
export type Clip = typeof clips.$inferSelect;

export const projectInsertSchema = createInsertSchema(projects, {
  name: (schema) => schema.min(1, "Project name is required"),
});
export type ProjectInsert = z.infer<typeof projectInsertSchema>;
export type Project = typeof projects.$inferSelect;

export const aiSuggestionInsertSchema = createInsertSchema(aiSuggestions, {
  suggestion: (schema) => schema.min(1, "Suggestion text is required"),
  botType: (schema) => schema.min(1, "Bot type is required"),
});
export type AISuggestionInsert = z.infer<typeof aiSuggestionInsertSchema>;
export type AISuggestion = typeof aiSuggestions.$inferSelect;

export const sampleInsertSchema = createInsertSchema(samples, {
  name: (schema) => schema.min(1, "Sample name is required"),
  category: (schema) => schema.min(1, "Category is required"),
  audioUrl: (schema) => schema.min(1, "Audio URL is required"),
});
export type SampleInsert = z.infer<typeof sampleInsertSchema>;
export type Sample = typeof samples.$inferSelect;
