import OpenAI from "openai";
import { AISuggestionInsert } from "@shared/schema";
import { db } from "@db";
import { aiSuggestions } from "@shared/schema";

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
}

export const openAIService = new OpenAIService();