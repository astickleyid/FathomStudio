import { db } from "@db";
import { eq, and, desc } from "drizzle-orm";
import {
  tracks,
  clips,
  projects,
  aiSuggestions,
  samples,
  Track,
  Project,
  Clip,
  AISuggestion,
  Sample,
  TrackInsert,
  ProjectInsert,
  ClipInsert,
  AISuggestionInsert,
  SampleInsert
} from "@shared/schema";

export const storage = {
  // Projects
  async getAllProjects(): Promise<Project[]> {
    return db.query.projects.findMany({
      orderBy: desc(projects.updatedAt)
    });
  },

  async getProjectById(id: number): Promise<Project | undefined> {
    const result = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        tracks: true
      }
    });
    
    return result;
  },

  async createProject(data: ProjectInsert): Promise<Project> {
    const [newProject] = await db.insert(projects).values(data).returning();
    return newProject;
  },

  async updateProject(id: number, data: Partial<ProjectInsert>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    
    return updatedProject;
  },

  // Tracks
  async getTracksByProjectId(projectId: number): Promise<Track[]> {
    return db.query.tracks.findMany({
      where: eq(tracks.projectId, projectId),
      with: {
        clips: true
      }
    });
  },

  async createTrack(data: TrackInsert): Promise<Track> {
    const [newTrack] = await db.insert(tracks).values(data).returning();
    return newTrack;
  },

  async updateTrack(id: number, data: Partial<TrackInsert>): Promise<Track | undefined> {
    const [updatedTrack] = await db
      .update(tracks)
      .set(data)
      .where(eq(tracks.id, id))
      .returning();
    
    return updatedTrack;
  },

  // Clips
  async getClipsByTrackId(trackId: number): Promise<Clip[]> {
    return db.query.clips.findMany({
      where: eq(clips.trackId, trackId),
      orderBy: clips.startTime
    });
  },

  async createClip(data: ClipInsert): Promise<Clip> {
    const [newClip] = await db.insert(clips).values(data).returning();
    return newClip;
  },

  // AI Suggestions
  async getAISuggestionsByProjectId(projectId: number): Promise<AISuggestion[]> {
    return db.query.aiSuggestions.findMany({
      where: eq(aiSuggestions.projectId, projectId),
      orderBy: desc(aiSuggestions.createdAt),
      with: {
        track: true
      }
    });
  },

  async createAISuggestion(data: AISuggestionInsert): Promise<AISuggestion> {
    const [newSuggestion] = await db.insert(aiSuggestions).values(data).returning();
    return newSuggestion;
  },

  // Sound Library Samples
  async getSamples(category?: string): Promise<Sample[]> {
    if (category) {
      return db.query.samples.findMany({
        where: eq(samples.category, category),
        orderBy: samples.name
      });
    }
    
    return db.query.samples.findMany({
      orderBy: samples.name
    });
  },

  async createSample(data: SampleInsert): Promise<Sample> {
    const [newSample] = await db.insert(samples).values(data).returning();
    return newSample;
  }
};
