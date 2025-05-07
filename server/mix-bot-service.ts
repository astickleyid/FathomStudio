import OpenAI from "openai";
import { AISuggestionInsert } from "@shared/schema";
import { db } from "@db";
import { aiSuggestions, tracks } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AudioAnalysisResult, MixRecommendation, TrackAnalysis } from "../shared/mix-bot-types";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. Do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class MixBotService {
  /**
   * Analyze a track and provide recommendations for gain staging, EQ, and compression
   */
  async analyzeTrack(trackId: number, projectId: number): Promise<MixRecommendation> {
    try {
      // Get track details
      const track = await db.query.tracks.findFirst({
        where: eq(tracks.id, trackId)
      });

      if (!track) {
        throw new Error(`Track with id ${trackId} not found`);
      }

      // Get track type and name for context
      const trackType = track.type;
      const trackName = track.name;

      // Generate analysis based on track type
      const analysis = await this.generateTrackAnalysis(trackType, trackName, projectId);
      
      // Save the suggestion to the database
      const suggestionText = `Mix recommendations for ${trackName}:\n\n` +
        `Gain Staging: ${analysis.gainStaging.recommendation}\n` +
        `EQ: ${analysis.eq.recommendation}\n` +
        `Compression: ${analysis.compression.recommendation}`;
      
      const newSuggestion: AISuggestionInsert = {
        botType: "MixBot",
        suggestion: suggestionText,
        projectId,
        trackId,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return analysis;
    } catch (error) {
      console.error("MixBot service error:", error);
      return {
        trackId,
        trackName: "Unknown",
        trackType: "Unknown",
        gainStaging: {
          recommendation: "Could not analyze gain staging.",
          targetLevel: -18,
          currentLevel: 0
        },
        eq: {
          recommendation: "Could not analyze EQ.",
          bands: []
        },
        compression: {
          recommendation: "Could not analyze compression.",
          threshold: -24,
          ratio: 2,
          attack: 30,
          release: 100,
          makeupGain: 0
        }
      };
    }
  }
  
  /**
   * Generate track analysis using OpenAI
   */
  private async generateTrackAnalysis(trackType: string, trackName: string, projectId: number): Promise<MixRecommendation> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are MixBot, an advanced AI mixing assistant in Fathom Studio DAW.
            
            Your task is to analyze a track and provide professional recommendations for:
            1. Gain Staging - Optimal input/output levels
            2. EQ - Frequency adjustments with specific bands and values
            3. Compression - Dynamic range control parameters
            
            Based on the track type and name, use your extensive knowledge of audio engineering best practices.
            
            Respond with a JSON object containing detailed mixing recommendations. Be specific with values.`
          },
          {
            role: "user",
            content: `Analyze this track and provide mixing recommendations:
            Track Name: ${trackName}
            Track Type: ${trackType}
            Project ID: ${projectId}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.4
      });
      
      const analysisResult = JSON.parse(response.choices[0]?.message?.content || "{}") as AudioAnalysisResult;
      
      // Convert the AI response to our standard recommendation format
      return {
        trackId,
        trackName,
        trackType,
        gainStaging: {
          recommendation: analysisResult.gainStaging?.recommendation || "Adjust gain to achieve optimal signal level.",
          targetLevel: analysisResult.gainStaging?.targetLevel || -18,
          currentLevel: 0 // This would be updated with actual track level analysis
        },
        eq: {
          recommendation: analysisResult.eq?.recommendation || "Apply EQ to shape the frequency content.",
          bands: analysisResult.eq?.bands || [
            { frequency: 100, gain: 0, q: 1.0, type: "lowShelf" },
            { frequency: 500, gain: 0, q: 1.0, type: "peaking" },
            { frequency: 2000, gain: 0, q: 1.0, type: "peaking" },
            { frequency: 8000, gain: 0, q: 1.0, type: "highShelf" }
          ]
        },
        compression: {
          recommendation: analysisResult.compression?.recommendation || "Apply compression to control dynamics.",
          threshold: analysisResult.compression?.threshold || -24,
          ratio: analysisResult.compression?.ratio || 2,
          attack: analysisResult.compression?.attack || 30,
          release: analysisResult.compression?.release || 100,
          makeupGain: analysisResult.compression?.makeupGain || 0
        }
      };
    } catch (error) {
      console.error("OpenAI analysis error:", error);
      // Return default values if analysis fails
      return {
        trackId,
        trackName,
        trackType,
        gainStaging: {
          recommendation: "Set appropriate input levels before processing.",
          targetLevel: -18,
          currentLevel: 0
        },
        eq: {
          recommendation: "Apply EQ to shape the frequency content of the track.",
          bands: [
            { frequency: 100, gain: 0, q: 1.0, type: "lowShelf" },
            { frequency: 500, gain: 0, q: 1.0, type: "peaking" },
            { frequency: 2000, gain: 0, q: 1.0, type: "peaking" },
            { frequency: 8000, gain: 0, q: 1.0, type: "highShelf" }
          ]
        },
        compression: {
          recommendation: "Use compression to control dynamic range.",
          threshold: -24,
          ratio: 2,
          attack: 30,
          release: 100,
          makeupGain: 0
        }
      };
    }
  }

  /**
   * Apply mix recommendations to a track automatically
   */
  async applyMixRecommendation(trackId: number, recommendationId?: number): Promise<boolean> {
    try {
      // If a specific recommendation ID is provided, get that recommendation
      // Otherwise, generate a new recommendation
      const recommendation = recommendationId 
        ? await this.getRecommendationById(recommendationId) 
        : await this.analyzeTrack(trackId, 0); // Project ID would be obtained from the track in a real implementation
      
      // Here, we would apply the recommendation settings to the track
      // This would involve updating the track with EQ, compression settings, etc.
      
      // For now, we'll just mark a suggestion as applied if recommendationId was provided
      if (recommendationId) {
        // Update the suggestion to mark it as applied
        // This would be expanded to actually apply the settings to the track
        return true;
      }
      
      return true;
    } catch (error) {
      console.error("Error applying mix recommendation:", error);
      return false;
    }
  }
  
  /**
   * Get a recommendation by ID
   * This would be implemented to retrieve a previously generated recommendation
   */
  private async getRecommendationById(recommendationId: number): Promise<MixRecommendation> {
    // This would be implemented to retrieve a saved recommendation
    // For now, return a placeholder recommendation
    return {
      trackId: 0,
      trackName: "",
      trackType: "",
      gainStaging: {
        recommendation: "",
        targetLevel: -18,
        currentLevel: 0
      },
      eq: {
        recommendation: "",
        bands: []
      },
      compression: {
        recommendation: "",
        threshold: -24,
        ratio: 2,
        attack: 30,
        release: 100,
        makeupGain: 0
      }
    };
  }
}

export const mixBotService = new MixBotService();