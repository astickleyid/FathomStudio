import OpenAI from "openai";
import { AISuggestionInsert } from "@shared/schema";
import { db } from "@db";
import { aiSuggestions } from "@shared/schema";

// Create an OpenAI client instance
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class OpenAIService {
  /**
   * Process a natural language command from the user
   */
  async processCommand(command: string, projectId: number): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Fathom AI, a music production assistant embedded in a Digital Audio Workstation. 
            You provide helpful, concise advice about music production techniques, suggest mixing approaches, 
            and recommend creative ideas. Focus on being specific and practical. When asked about technical 
            concepts, explain them briefly but focus on actionable advice. Keep responses under 100 words.
            
            Current project information:
            - Project ID: ${projectId}
            - User query: ${command}`
          },
          { 
            role: "user", 
            content: command 
          }
        ],
        max_tokens: 150
      });
      
      // Extract the response text
      const suggestion = response.choices[0]?.message?.content || "I couldn't process that request.";
      
      // Save the suggestion to the database
      const newSuggestion: AISuggestionInsert = {
        botType: "CommandBot",
        suggestion,
        projectId,
        trackId: null,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return suggestion;
    } catch (error) {
      console.error("OpenAI service error:", error);
      return "Sorry, I encountered an error processing your request.";
    }
  }

  /**
   * Generate mixing suggestions for a specific track
   */
  async generateMixSuggestions(trackId: number, trackName: string, projectId: number): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are MixBot, an AI mixing assistant in a Digital Audio Workstation.
            Generate precise mixing suggestions for a track named "${trackName}".
            Include specific settings for EQ, compression, and effects, with exact parameter values.
            Format suggestions as bullet points. Keep the total response under 150 words.`
          },
          {
            role: "user",
            content: `Suggest mixing settings for my "${trackName}" track.`
          }
        ],
        max_tokens: 200
      });
      
      const suggestion = response.choices[0]?.message?.content || "I couldn't generate mixing suggestions.";
      
      // Save the suggestion to the database
      const newSuggestion: AISuggestionInsert = {
        botType: "MixBot",
        suggestion,
        projectId,
        trackId,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return suggestion;
    } catch (error) {
      console.error("OpenAI service error:", error);
      return "Sorry, I encountered an error generating mixing suggestions.";
    }
  }

  /**
   * Generate creative ideas for a project
   */
  async generateCreativeIdeas(projectId: number, tempo: number, timeSignature: string): Promise<string> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are IdeaBot, a creative music production assistant in a Digital Audio Workstation.
            Generate creative ideas for a music project with tempo ${tempo} BPM and time signature ${timeSignature}.
            Suggest specific instruments, sounds, effects, and arrangement tips.
            Format as numbered points. Keep the total response under 150 words.`
          },
          {
            role: "user",
            content: `Give me creative ideas for my music project (${tempo} BPM, ${timeSignature}).`
          }
        ],
        max_tokens: 200
      });
      
      const suggestion = response.choices[0]?.message?.content || "I couldn't generate creative ideas.";
      
      // Save the suggestion to the database
      const newSuggestion: AISuggestionInsert = {
        botType: "IdeaBot",
        suggestion,
        projectId,
        trackId: null,
        isApplied: false
      };
      
      await db.insert(aiSuggestions).values(newSuggestion);
      
      return suggestion;
    } catch (error) {
      console.error("OpenAI service error:", error);
      return "Sorry, I encountered an error generating creative ideas.";
    }
  }

  /**
   * Analyze a text command to determine what the user wants to do
   */
  async analyzeCommand(command: string): Promise<{
    type: 'mix' | 'idea' | 'help' | 'unknown',
    trackId?: number,
    intent: string
  }> {
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a command analyzer for a Digital Audio Workstation.
            Analyze the user's command and determine their intent.
            Classify the intent as one of: "mix", "idea", "help", or "unknown".
            Respond in JSON format with fields: type, trackId (if mentioned), intent (brief summary).`
          },
          {
            role: "user",
            content: command
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 100
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{"type":"unknown","intent":"Could not analyze command"}');
      return result;
    } catch (error) {
      console.error("OpenAI command analysis error:", error);
      return { type: 'unknown', intent: 'Error analyzing command' };
    }
  }
}

export const openAIService = new OpenAIService();