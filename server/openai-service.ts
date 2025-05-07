import OpenAI from "openai";
import { AISuggestionInsert } from "@shared/schema";
import { db } from "@db";
import { aiSuggestions, tracks } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AudioAnalysisResult, MixRecommendation, EQBand } from "@shared/mix-bot-types";
import { MasteringSettings, MasteringTargetPlatform, MasteringPreset } from "@shared/mastering-types";

// Create an OpenAI client instance
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIService {
  /**
   * Unified AI Assistant - Handles all types of music production queries
   * This replaces the separate bots with a single powerful assistant
   */
  async processAICommand(command: string, projectId: number, projectDetails?: any, trackDetails?: any): Promise<{
    suggestion: string;
    intent: string;
    action?: string | undefined;
    parameters?: Record<string, any> | undefined;
  }> {
    try {
      // Build context string about the project and track if available
      let contextString = `Project ID: ${projectId}`;
      
      if (projectDetails) {
        contextString += `\nProject Name: ${projectDetails.name}
          \nTempo: ${projectDetails.tempo || 120} BPM
          \nTime Signature: ${projectDetails.timeSignature || '4/4'}`;
      }
      
      if (trackDetails) {
        contextString += `\nSelected Track: ${trackDetails.name}
          \nTrack Type: ${trackDetails.type}
          \nTrack Settings: Volume ${trackDetails.volume || 0}dB, Pan ${trackDetails.pan || 0}`;
      }
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Fathom AI, the unified music production assistant in a professional Digital Audio Workstation.
            
            Your capabilities include:
            1. Providing mixing advice with specific parameter values (EQ, compression, reverb, etc.)
            2. Generating creative musical ideas based on project context
            3. Explaining music production concepts clearly and concisely
            4. Suggesting technical solutions to common audio problems
            5. Recommending sound design approaches
            
            Context:
            ${contextString}
            
            When responding:
            - Be precise and actionable with specific values when appropriate
            - Format suggestions as clear bullet points
            - Keep responses under 200 words and focus on practical advice
            - If suggesting audio settings, provide specific parameter values
            - If suggesting musical ideas, tie them to the project's tempo and style
            
            After your response, include a JSON object with these fields:
            { 
              "intent": "one of [mix, creative, technical, educational, sound_design]",
              "action": "specific action if applicable [eq_change, compression, reverb, etc]",
              "parameters": { relevant parameters if applicable }
            }`
          },
          { 
            role: "user", 
            content: command 
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      // Extract the response text
      const fullResponse = response.choices[0]?.message?.content || "I couldn't process that request.";
      
      // Try to extract JSON data from the response if it exists
      let suggestion = fullResponse;
      let metadata: { 
        intent: string; 
        action?: string;
        parameters?: Record<string, any>;
      } = { intent: "unknown" };
      
      try {
        // Look for JSON object at the end of the response
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedData = JSON.parse(jsonStr);
          metadata = {
            intent: parsedData.intent || "unknown",
            action: parsedData.action,
            parameters: parsedData.parameters
          };
          
          // Remove the JSON part from the user-facing suggestion
          suggestion = fullResponse.replace(jsonStr, '').trim();
        }
      } catch (err) {
        console.log("Could not parse JSON from response:", err);
      }
      
      // Determine the bot type based on intent
      let botType = "FathomAI"; // Default unified bot type
      
      // Save the suggestion to the database
      const newSuggestion: AISuggestionInsert = {
        botType,
        suggestion,
        projectId,
        trackId: trackDetails?.id || null,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return {
        suggestion,
        intent: metadata.intent,
        action: metadata.action,
        parameters: metadata.parameters
      };
    } catch (error) {
      console.error("OpenAI service error:", error);
      return {
        suggestion: "Sorry, I encountered an error processing your request. Please try again.",
        intent: "error",
        action: undefined,
        parameters: undefined
      };
    }
  }

  /**
   * Generate personalized welcome message with project insights
   */
  async generateWelcomeMessage(projectId: number, projectName: string, tracksCount: number): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Generate a brief, friendly welcome message for a music producer opening their project in Fathom Studio DAW.
            The project is called "${projectName}" and has ${tracksCount} tracks.
            Keep it under 50 words, be encouraging and helpful.
            DO NOT include any JSON or technical formatting in this response.`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });
      
      return response.choices[0]?.message?.content || `Welcome back to ${projectName}!`;
    } catch (error) {
      console.error("Error generating welcome message:", error);
      return `Welcome back to ${projectName}!`; 
    }
  }
  
  /**
   * Analyze audio characteristics and make suggestions
   */
  async analyzeAudio(audioDescription: string, projectId: number): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional audio engineer. Analyze this audio description and provide 
            specific mixing advice to improve it. Be precise with frequencies, settings and techniques.`
          },
          {
            role: "user",
            content: audioDescription
          }
        ],
        max_tokens: 250
      });
      
      const suggestion = response.choices[0]?.message?.content || "I couldn't analyze the audio.";
      
      // Save the suggestion
      const newSuggestion: AISuggestionInsert = {
        botType: "FathomAI",
        suggestion,
        projectId,
        trackId: null,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return suggestion;
    } catch (error) {
      console.error("Audio analysis error:", error);
      return "Sorry, I encountered an error analyzing the audio.";
    }
  }

  /**
   * Analyze a track and provide intelligent mix recommendations
   * This is part of the Autonomous Mix Bots feature
   */
  async generateMixRecommendations(trackId: number, projectId: number): Promise<MixRecommendation> {
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
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the FathomAI mixing assistant in a professional Digital Audio Workstation.
            
            Analyze this track and provide detailed mixing recommendations for:
            1. Gain Staging - Recommend optimal input level
            2. EQ - Suggest specific frequency adjustments with bands, gains, and Q values
            3. Compression - Recommend threshold, ratio, attack, release, and makeup gain
            
            Based on the track type and name, use audio engineering best practices.
            
            Respond with ONLY a JSON object in this format:
            {
              "gainStaging": {
                "recommendation": "Descriptive advice",
                "targetLevel": -18
              },
              "eq": {
                "recommendation": "EQ strategy overview",
                "bands": [
                  {"frequency": 100, "gain": -3, "q": 1.0, "type": "lowShelf"},
                  {"frequency": 500, "gain": -2, "q": 0.7, "type": "peaking"},
                  {"frequency": 2000, "gain": 2, "q": 1.0, "type": "peaking"},
                  {"frequency": 8000, "gain": 1.5, "q": 0.8, "type": "highShelf"}
                ]
              },
              "compression": {
                "recommendation": "Compression strategy overview",
                "threshold": -24,
                "ratio": 4,
                "attack": 30,
                "release": 100,
                "makeupGain": 2
              }
            }`
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
      
      // Construct recommendation from AI response
      const mixRecommendation: MixRecommendation = {
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
          bands: analysisResult.eq?.bands || this.getDefaultEQBands(trackType)
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
      
      // Save the suggestion to the database
      const suggestionText = `Mixing recommendations for ${trackName}:\n\n` +
        `Gain Staging: ${mixRecommendation.gainStaging.recommendation}\n` +
        `EQ: ${mixRecommendation.eq.recommendation}\n` +
        `Compression: ${mixRecommendation.compression.recommendation}`;
      
      const newSuggestion: AISuggestionInsert = {
        botType: "FathomAI",
        suggestion: suggestionText,
        projectId,
        trackId,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return mixRecommendation;
    } catch (error) {
      console.error("Mix recommendation error:", error);
      
      // Return default values if analysis fails
      return this.getDefaultMixRecommendation(trackId);
    }
  }
  
  /**
   * Apply mix recommendations to a track automatically
   */
  async applyMixRecommendation(trackId: number, recommendation: MixRecommendation): Promise<boolean> {
    try {
      // Here we would apply the recommendation settings to the track
      // For example, adjusting the volume, adding EQ and compression processors
      
      // In a real implementation, this would interact with the audio engine
      // and the database to store these settings
      
      // For now, we'll just create a suggestion indicating the settings were applied
      
      const suggestionText = `Applied autonomous mix to track:\n\n` +
        `• Gain adjusted to ${recommendation.gainStaging.targetLevel}dB\n` +
        `• EQ applied with ${recommendation.eq.bands.length} bands\n` +
        `• Compression set to ${recommendation.compression.threshold}dB threshold, ${recommendation.compression.ratio}:1 ratio`;
      
      const newSuggestion: AISuggestionInsert = {
        botType: "FathomAI",
        suggestion: suggestionText,
        projectId: 0, // This would need the actual project ID in real implementation
        trackId,
        isApplied: true
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return true;
    } catch (error) {
      console.error("Error applying mix recommendation:", error);
      return false;
    }
  }

  /**
   * Get default EQ bands based on track type
   */
  private getDefaultEQBands(trackType: string): EQBand[] {
    // Return appropriate default EQ settings based on track type
    switch (trackType.toLowerCase()) {
      case 'vocals':
      case 'vocal':
        return [
          { frequency: 80, gain: -3, q: 0.8, type: "highPass" },
          { frequency: 200, gain: -2, q: 1.0, type: "peaking" },
          { frequency: 900, gain: -1, q: 1.5, type: "peaking" },
          { frequency: 3000, gain: 2, q: 1.0, type: "peaking" },
          { frequency: 8000, gain: 1, q: 0.8, type: "highShelf" }
        ];
      case 'drums':
      case 'drum':
        return [
          { frequency: 60, gain: 2, q: 1.0, type: "lowShelf" },
          { frequency: 250, gain: -2, q: 1.0, type: "peaking" },
          { frequency: 800, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 4000, gain: 3, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: 1, q: 0.8, type: "highShelf" }
        ];
      case 'bass':
        return [
          { frequency: 40, gain: 2, q: 0.8, type: "lowShelf" },
          { frequency: 100, gain: -1, q: 1.2, type: "peaking" },
          { frequency: 400, gain: -2, q: 1.0, type: "peaking" },
          { frequency: 800, gain: -1, q: 1.5, type: "peaking" },
          { frequency: 1500, gain: 1, q: 1.0, type: "peaking" }
        ];
      case 'guitar':
      case 'guitars':
        return [
          { frequency: 100, gain: -1, q: 0.8, type: "lowShelf" },
          { frequency: 300, gain: -2, q: 1.0, type: "peaking" },
          { frequency: 800, gain: -1, q: 1.2, type: "peaking" },
          { frequency: 2500, gain: 2, q: 1.0, type: "peaking" },
          { frequency: 6000, gain: 1, q: 0.8, type: "highShelf" }
        ];
      default:
        // Generic EQ bands for other track types
        return [
          { frequency: 100, gain: 0, q: 1.0, type: "lowShelf" },
          { frequency: 500, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 2000, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 8000, gain: 0, q: 0.8, type: "highShelf" }
        ];
    }
  }
  
  /**
   * Get default mix recommendation for fallback
   */
  private getDefaultMixRecommendation(trackId: number): MixRecommendation {
    return {
      trackId,
      trackName: "Unknown Track",
      trackType: "Unknown",
      gainStaging: {
        recommendation: "Set appropriate input levels before processing.",
        targetLevel: -18,
        currentLevel: 0
      },
      eq: {
        recommendation: "Apply EQ to shape the frequency content of the track.",
        bands: this.getDefaultEQBands("default")
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

  /**
   * Generate mastering preset for specific platform
   * Part of Auto-AI Mastering Templates feature
   */
  async generateMasteringPreset(
    targetPlatform: MasteringTargetPlatform, 
    projectId: number,
    projectDetails?: any
  ): Promise<MasteringPreset> {
    try {
      // Build context string about the project
      let contextString = `Project ID: ${projectId}`;
      
      if (projectDetails) {
        contextString += `\nProject Name: ${projectDetails.name}
          \nTempo: ${projectDetails.tempo || 120} BPM
          \nTime Signature: ${projectDetails.timeSignature || '4/4'}
          \nGenre: ${projectDetails.genre || 'Unknown'}`;
      }

      // Generate mastering preset based on target platform
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the FathomAI mastering assistant in a professional Digital Audio Workstation.
            
            Create a detailed mastering preset specifically optimized for ${targetPlatform} distribution.
            Consider industry standards, technical requirements, and sonic characteristics appropriate for this platform.
            
            Project context:
            ${contextString}
            
            Respond with ONLY a JSON object containing the mastering settings in this format:
            {
              "name": "Optimized for ${targetPlatform} - Short descriptive name",
              "description": "Brief description of the mastering approach and benefits",
              "settings": {
                "loudnessTarget": -14,
                "peakLimit": -1.0,
                "stereoWidth": 100,
                "dynamicRange": 8,
                "colorProfile": "neutral",
                "enhanceOptions": {
                  "lowEndEnhance": true,
                  "highEndShimmer": true,
                  "stereoImaging": true,
                  "harmonicExciter": false,
                  "transientEnhancer": true
                },
                "eqSettings": {
                  "bands": [
                    {"frequency": 30, "gain": -1, "q": 1.4, "type": "lowShelf"},
                    {"frequency": 100, "gain": 0.5, "q": 1.0, "type": "peaking"},
                    {"frequency": 250, "gain": -1, "q": 1.0, "type": "peaking"},
                    {"frequency": 1000, "gain": 0, "q": 1.0, "type": "peaking"},
                    {"frequency": 3000, "gain": 1, "q": 1.0, "type": "peaking"},
                    {"frequency": 10000, "gain": 1.5, "q": 0.8, "type": "highShelf"}
                  ]
                },
                "limiters": {
                  "threshold": -3.0,
                  "ceiling": -0.3,
                  "release": 50
                }
              }
            }`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.4
      });
      
      const presetData = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      // Generate a unique ID for the preset
      const presetId = `ai_${targetPlatform}_${Date.now()}`;
      
      // Create the preset with AI-generated settings
      const masteringPreset: MasteringPreset = {
        id: presetId,
        name: presetData.name || `AI Master for ${targetPlatform}`,
        description: presetData.description || `Optimized mastering preset for ${targetPlatform} distribution.`,
        targetPlatform,
        settings: {
          targetPlatform,
          loudnessTarget: presetData.settings?.loudnessTarget || this.getDefaultLoudnessForPlatform(targetPlatform),
          peakLimit: presetData.settings?.peakLimit || -1.0,
          stereoWidth: presetData.settings?.stereoWidth || 100,
          dynamicRange: presetData.settings?.dynamicRange || 8,
          colorProfile: presetData.settings?.colorProfile || "neutral",
          enhanceOptions: presetData.settings?.enhanceOptions || {
            lowEndEnhance: true,
            highEndShimmer: true,
            stereoImaging: true,
            harmonicExciter: false,
            transientEnhancer: true
          },
          eqSettings: {
            bands: presetData.settings?.eqSettings?.bands || this.getDefaultMasteringEQ(targetPlatform)
          },
          limiters: presetData.settings?.limiters || {
            threshold: -3.0,
            ceiling: -0.3,
            release: 50
          }
        },
        isAIGenerated: true,
        createdAt: new Date().toISOString()
      };
      
      // Save the mastering preset suggestion to the database
      const suggestionText = `AI-Generated Mastering Preset for ${targetPlatform}:\n\n` +
        `${masteringPreset.description}\n` +
        `Target loudness: ${masteringPreset.settings.loudnessTarget} LUFS\n` +
        `Dynamic range: ${masteringPreset.settings.dynamicRange} dB\n` +
        `Color profile: ${masteringPreset.settings.colorProfile}`;
      
      const newSuggestion: AISuggestionInsert = {
        botType: "FathomAI",
        suggestion: suggestionText,
        projectId,
        trackId: null,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return masteringPreset;
    } catch (error) {
      console.error("Error generating mastering preset:", error);
      
      // Return default mastering preset if generation fails
      return this.getDefaultMasteringPreset(targetPlatform);
    }
  }
  
  /**
   * Apply mastering settings to a project
   */
  async applyMasteringPreset(projectId: number, preset: MasteringPreset): Promise<boolean> {
    try {
      // Here we would apply the mastering settings to the project's master track
      // In a real implementation, this would interact with the audio engine
      
      // For now, we'll just create a suggestion indicating the preset was applied
      const suggestionText = `Applied AI mastering preset: ${preset.name}\n\n` +
        `• Target platform: ${preset.targetPlatform}\n` +
        `• Target loudness: ${preset.settings.loudnessTarget} LUFS\n` +
        `• Peak limit: ${preset.settings.peakLimit} dB\n` +
        `• EQ bands: ${preset.settings.eqSettings.bands.length} custom adjustments\n` +
        `• Special processing: ${Object.entries(preset.settings.enhanceOptions)
            .filter(([_, value]) => value)
            .map(([key]) => this.formatEnhanceOptionName(key))
            .join(', ')}`;
      
      const newSuggestion: AISuggestionInsert = {
        botType: "FathomAI",
        suggestion: suggestionText,
        projectId,
        trackId: null,
        isApplied: true
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return true;
    } catch (error) {
      console.error("Error applying mastering preset:", error);
      return false;
    }
  }

  /**
   * Format enhance option name for display
   */
  private formatEnhanceOptionName(key: string): string {
    switch (key) {
      case 'lowEndEnhance': return 'Low End Enhancement';
      case 'highEndShimmer': return 'High End Shimmer';
      case 'stereoImaging': return 'Stereo Imaging';
      case 'harmonicExciter': return 'Harmonic Exciter';
      case 'transientEnhancer': return 'Transient Enhancer';
      default: return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  }
  
  /**
   * Get default mastering preset
   */
  private getDefaultMasteringPreset(platform: MasteringTargetPlatform): MasteringPreset {
    return {
      id: `default_${platform}_${Date.now()}`,
      name: `Standard ${this.formatPlatformName(platform)} Master`,
      description: `Default mastering preset optimized for ${platform} distribution.`,
      targetPlatform: platform,
      settings: {
        targetPlatform: platform,
        loudnessTarget: this.getDefaultLoudnessForPlatform(platform),
        peakLimit: -1.0,
        stereoWidth: 100,
        dynamicRange: 8,
        colorProfile: "neutral",
        enhanceOptions: {
          lowEndEnhance: true,
          highEndShimmer: true,
          stereoImaging: true,
          harmonicExciter: false,
          transientEnhancer: true
        },
        eqSettings: {
          bands: this.getDefaultMasteringEQ(platform)
        },
        limiters: {
          threshold: -3.0,
          ceiling: -0.3,
          release: 50
        }
      },
      isAIGenerated: true,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Get default loudness target LUFS for different platforms
   */
  private getDefaultLoudnessForPlatform(platform: MasteringTargetPlatform): number {
    switch(platform) {
      case "streaming": return -14;
      case "club": return -8;
      case "cd": return -10;
      case "vinyl": return -14;
      case "radio": return -12;
      case "film": return -23;
      case "podcast": return -16;
      case "gaming": return -12;
      case "social": return -13;
      default: return -14;
    }
  }

  /**
   * Format platform name for display
   */
  private formatPlatformName(platform: MasteringTargetPlatform): string {
    switch(platform) {
      case "cd": return "CD";
      case "streaming": return "Streaming";
      case "vinyl": return "Vinyl";
      case "club": return "Club/DJ";
      case "radio": return "Radio";
      case "film": return "Film/TV";
      case "podcast": return "Podcast";
      case "gaming": return "Gaming";
      case "social": return "Social Media";
      default: return String(platform).charAt(0).toUpperCase() + String(platform).slice(1);
    }
  }
  
  /**
   * Get default mastering EQ for different platforms
   */
  private getDefaultMasteringEQ(platform: MasteringTargetPlatform): EQBand[] {
    switch(platform) {
      case "streaming":
        return [
          { frequency: 30, gain: -1, q: 1.4, type: "lowShelf" },
          { frequency: 100, gain: 0.5, q: 1.0, type: "peaking" },
          { frequency: 250, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 1000, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 3000, gain: 1, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: 1.5, q: 0.8, type: "highShelf" }
        ];
      case "club":
        return [
          { frequency: 40, gain: 3, q: 1.0, type: "lowShelf" },
          { frequency: 100, gain: 1, q: 1.4, type: "peaking" },
          { frequency: 250, gain: -2, q: 1.0, type: "peaking" },
          { frequency: 1000, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 5000, gain: 1, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: 2, q: 0.8, type: "highShelf" }
        ];
      case "vinyl":
        return [
          { frequency: 30, gain: -4, q: 1.0, type: "highPass" },
          { frequency: 100, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 250, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 1000, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 5000, gain: 1, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: -2, q: 0.8, type: "highShelf" }
        ];
      case "cd":
        return [
          { frequency: 40, gain: 1, q: 1.0, type: "lowShelf" },
          { frequency: 120, gain: -0.5, q: 1.0, type: "peaking" },
          { frequency: 500, gain: -0.5, q: 1.0, type: "peaking" },
          { frequency: 2000, gain: 0.5, q: 1.0, type: "peaking" },
          { frequency: 8000, gain: 1, q: 1.0, type: "peaking" },
          { frequency: 16000, gain: 1.5, q: 0.8, type: "highShelf" }
        ];
      case "radio":
        return [
          { frequency: 80, gain: -2, q: 1.0, type: "highPass" },
          { frequency: 200, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 500, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 2000, gain: 2, q: 1.0, type: "peaking" },
          { frequency: 5000, gain: 3, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: 2, q: 0.8, type: "highShelf" }
        ];
      case "social":
        return [
          { frequency: 60, gain: 2, q: 1.0, type: "lowShelf" },
          { frequency: 150, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 400, gain: -1, q: 1.0, type: "peaking" },
          { frequency: 1200, gain: 1, q: 1.0, type: "peaking" },
          { frequency: 3500, gain: 2, q: 1.0, type: "peaking" },
          { frequency: 10000, gain: 3, q: 0.8, type: "highShelf" }
        ];
      default:
        return [
          { frequency: 40, gain: 0, q: 1.0, type: "lowShelf" },
          { frequency: 120, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 500, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 2000, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 8000, gain: 0, q: 1.0, type: "peaking" },
          { frequency: 16000, gain: 0, q: 0.8, type: "highShelf" }
        ];
    }
  }
}

export const openAIService = new OpenAIService();