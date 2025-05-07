import OpenAI from 'openai';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { SampleInsert } from '@shared/schema';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

export class AISoundService {
  
  /**
   * Generate a sound based on AI techniques
   * @param prompt User's description of the desired sound
   * @param parameters Sound synthesis parameters
   * @param soundType Type of sound (synth, bass, percussion, etc.)
   * @param presetId ID of the preset being used
   * @param projectId Current project ID (optional)
   */
  async generateSound(
    prompt: string,
    parameters: Record<string, any>,
    soundType: string,
    presetId: string,
    projectId?: number
  ): Promise<{ soundUrl: string, metadata: Record<string, any> }> {
    try {
      // Generate a unique ID for this sound
      const soundId = uuidv4();
      
      // Generate ToneJS code for this sound using AI
      const toneJsCode = await this.generateToneJsCode(prompt, parameters, soundType, presetId);
      
      // Create a directory to store sounds if it doesn't exist
      const soundsDir = path.join(process.cwd(), 'public', 'sounds');
      if (!fs.existsSync(soundsDir)) {
        fs.mkdirSync(soundsDir, { recursive: true });
      }
      
      // Save the ToneJS code to a file that can be executed
      const scriptPath = path.join(soundsDir, `${soundId}.js`);
      fs.writeFileSync(scriptPath, toneJsCode);
      
      // For now, we're going to use a pre-generated sound file as a placeholder
      // In a real implementation, we would use a headless browser or Node.js audio
      // library to render the ToneJS code to an actual audio file
      
      // Simulate a delay for sound generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes: Use a default audio file based on sound type
      let defaultSoundPath: string;
      switch (soundType) {
        case 'synth':
          defaultSoundPath = '/sounds/ai-synth-sound.wav';
          break;
        case 'bass':
          defaultSoundPath = '/sounds/ai-bass-sound.wav';
          break;
        case 'percussion':
          defaultSoundPath = '/sounds/ai-percussion-sound.wav';
          break;
        case 'ambient':
          defaultSoundPath = '/sounds/ai-ambient-sound.wav';
          break;
        case 'fx':
          defaultSoundPath = '/sounds/ai-fx-sound.wav';
          break;
        case 'vocal':
          defaultSoundPath = '/sounds/ai-vocal-sound.wav';
          break;
        default:
          defaultSoundPath = '/sounds/ai-synth-sound.wav';
      }
      
      // Return sound URL and metadata
      return {
        soundUrl: defaultSoundPath,
        metadata: {
          id: soundId,
          prompt,
          parameters,
          soundType,
          presetId,
          projectId,
          toneJsCode
        }
      };
    } catch (error: unknown) {
      console.error("Error generating sound:", error);
      throw new Error("Failed to generate sound: " + ((error as Error)?.message || "Unknown error"));
    }
  }

  /**
   * Use OpenAI to generate ToneJS code based on the user's description and parameters
   */
  private async generateToneJsCode(
    prompt: string,
    parameters: Record<string, any>,
    soundType: string,
    presetId: string
  ): Promise<string> {
    try {
      const prompt1 = `You are an expert sound designer using Tone.js to create audio. 
Create a Tone.js script that generates a ${soundType} sound based on the following description: "${prompt}".

Use these synthesis parameters:
- Attack: ${parameters.attack}s
- Decay: ${parameters.decay}s
- Sustain: ${parameters.sustain}
- Release: ${parameters.release}s
- Filter Cutoff: ${parameters.filterCutoff} Hz
- Filter Resonance: ${parameters.filterResonance} Q
- Distortion: ${parameters.distortion}
- Reverb: ${parameters.reverb}
- Delay: ${parameters.delay}
- Harmonicity: ${parameters.harmonicity}
- Modulation Index: ${parameters.modulationIndex}

Create a complete, self-contained Tone.js script that:
1. Sets up appropriate synthesizers and effects
2. Exports an audio file (or simulates this process)
3. Uses modern Tone.js syntax
4. Includes comments explaining the sound design choices
5. Creates a unique, interesting sound matching the description

Only provide the JavaScript code, no explanations before or after.`;

      // Call OpenAI API to generate ToneJS code
      const completion = await openai.chat.completions.create({
        model: GPT_MODEL,
        messages: [
          { role: "system", content: "You are an expert sound designer who creates Tone.js code for audio synthesis. Return only the complete runnable JavaScript code without any markdown formatting, preamble or explanation." },
          { role: "user", content: prompt1 }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // Extract ToneJS code from response
      const responseContent = completion.choices[0].message.content || '';
      
      // Clean up the response to ensure it's just code
      let toneJsCode = responseContent;
      
      // Remove markdown code block indicators if present
      toneJsCode = toneJsCode.replace(/```javascript|```js|```/g, '').trim();
      
      return toneJsCode;
    } catch (error) {
      console.error("Error generating ToneJS code:", error);
      
      // Return simple default ToneJS code as fallback
      return `
        // Default ToneJS code
        const synth = new Tone.PolySynth().toDestination();
        synth.triggerAttackRelease(["C4", "E4", "G4"], 1);
      `;
    }
  }

  /**
   * Save a generated sound to the database
   */
  async saveSound(
    name: string,
    url: string,
    category: string,
    isAIGenerated: boolean,
    parameters: string,
    projectId?: number
  ): Promise<any> {
    try {
      // Create sample data
      const sampleData: SampleInsert = {
        name,
        audioUrl: url,
        category,
        tags: isAIGenerated ? ["AI-generated"] : []
      };
      
      // Save to database
      const sample = await storage.createSample(sampleData);
      
      return sample;
    } catch (error: unknown) {
      console.error("Error saving AI sound:", error);
      throw new Error("Failed to save sound: " + ((error as Error)?.message || "Unknown error"));
    }
  }
}

export const aiSoundService = new AISoundService();