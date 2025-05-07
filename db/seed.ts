import { db } from "./index";
import * as schema from "@shared/schema";

async function seed() {
  try {
    console.log("Seeding database...");
    
    // Create a default project
    const [defaultProject] = await db.insert(schema.projects)
      .values({
        name: "Demo Project",
        tempo: 120,
        timeSignature: "4/4",
        sampleRate: 44100,
      })
      .returning()
      .onConflictDoNothing();
    
    if (defaultProject) {
      console.log("Created default project");
      
      // Create some tracks
      const trackData = [
        { name: "Tap A", type: "audio", color: "#FF7A00", isAI: true, projectId: defaultProject.id },
        { name: "Tap G", type: "audio", color: "#CCCCCC", projectId: defaultProject.id },
        { name: "Tap AU", type: "audio", color: "#CCCCCC", projectId: defaultProject.id },
        { name: "Tap 4", type: "audio", color: "#CCCCCC", projectId: defaultProject.id },
        { name: "Tap B", type: "audio", color: "#FF7A00", isAI: true, projectId: defaultProject.id },
      ];
      
      const tracks = await Promise.all(
        trackData.map(async (track) => {
          const [newTrack] = await db.insert(schema.tracks)
            .values(track)
            .returning()
            .onConflictDoNothing();
          return newTrack;
        })
      );
      
      console.log(`Created ${tracks.filter(Boolean).length} tracks`);
      
      // Only create clips if we have tracks
      if (tracks[0]) {
        // Create some clips
        const clipData = [
          { 
            name: "Vocal Clip 1", 
            trackId: tracks[0].id, 
            startTime: 0, 
            duration: 44100 * 4,
            waveformData: JSON.stringify([0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.3, 0.5, 0.6, 0.2, 0.1])
          },
          { 
            name: "Beat Clip", 
            trackId: tracks[1].id, 
            startTime: 44100 * 2, 
            duration: 44100 * 4,
            waveformData: JSON.stringify([0.2, 0.4, 0.6, 0.8, 0.3, 0.2, 0.4, 0.5, 0.7, 0.3, 0.2])
          },
          { 
            name: "Bass Line", 
            trackId: tracks[2].id, 
            startTime: 0, 
            duration: 44100 * 8,
            waveformData: JSON.stringify([0.3, 0.5, 0.7, 0.4, 0.2, 0.3, 0.5, 0.6, 0.4, 0.3, 0.2])
          }
        ];
        
        const clips = await Promise.all(
          clipData.map(async (clip) => {
            const [newClip] = await db.insert(schema.clips)
              .values(clip)
              .returning()
              .onConflictDoNothing();
            return newClip;
          })
        );
        
        console.log(`Created ${clips.filter(Boolean).length} clips`);
      }
      
      // Create AI suggestions
      const suggestionData = [
        {
          botType: "MixBot",
          suggestion: "Try reducing the low-end on Tap G by -3dB at 180Hz to make space for the bass. The kick and bass are competing in that frequency range.",
          trackId: tracks[1]?.id || null,
          projectId: defaultProject.id
        },
        {
          botType: "ReverbBot",
          suggestion: "Adding a subtle room reverb to the vocals would help them sit better in the mix.",
          trackId: tracks[0]?.id || null,
          projectId: defaultProject.id
        }
      ];
      
      const suggestions = await Promise.all(
        suggestionData.map(async (suggestion) => {
          const [newSuggestion] = await db.insert(schema.aiSuggestions)
            .values(suggestion)
            .returning()
            .onConflictDoNothing();
          return newSuggestion;
        })
      );
      
      console.log(`Created ${suggestions.filter(Boolean).length} AI suggestions`);
    }
    
    // Seed sound library samples
    const sampleData = [
      {
        name: "Deep House Beat",
        category: "Drums",
        tempo: 120,
        key: "C",
        audioUrl: "/audio/samples/deep-house-beat.mp3",
        waveformData: JSON.stringify([0.2, 0.4, 0.5, 0.7, 0.3, 0.2, 0.5, 0.6, 0.8, 0.3, 0.2]),
        tags: ["deep house", "drums", "beat"]
      },
      {
        name: "Ambient Pad",
        category: "Synth",
        tempo: 80,
        key: "Am",
        audioUrl: "/audio/samples/ambient-pad.mp3",
        waveformData: JSON.stringify([0.1, 0.2, 0.3, 0.2, 0.1, 0.2, 0.3, 0.2, 0.1, 0.2, 0.3]),
        tags: ["ambient", "pad", "synth", "atmospheric"]
      },
      {
        name: "Synth Arp",
        category: "Synth",
        tempo: 140,
        key: "F#",
        audioUrl: "/audio/samples/synth-arp.mp3",
        waveformData: JSON.stringify([0.3, 0.1, 0.5, 0.2, 0.6, 0.3, 0.7, 0.4, 0.8, 0.5, 0.3]),
        tags: ["arp", "synth", "electronic"]
      },
      {
        name: "Chill Beat",
        category: "Drums",
        tempo: 90,
        key: "G",
        audioUrl: "/audio/samples/chill-beat.mp3",
        waveformData: JSON.stringify([0.2, 0.3, 0.5, 0.2, 0.4, 0.6, 0.3, 0.5, 0.2, 0.4, 0.3]),
        tags: ["chill", "lofi", "beat", "drums"]
      },
      {
        name: "House Loop",
        category: "Drums",
        tempo: 123,
        key: "C",
        audioUrl: "/audio/samples/house-loop.mp3",
        waveformData: JSON.stringify([0.4, 0.6, 0.5, 0.3, 0.7, 0.4, 0.6, 0.5, 0.3, 0.6, 0.4]),
        tags: ["house", "loop", "drums", "electronic"]
      },
      {
        name: "Trap Drums",
        category: "Drums",
        tempo: 140,
        key: "C",
        audioUrl: "/audio/samples/trap-drums.mp3",
        waveformData: JSON.stringify([0.3, 0.7, 0.2, 0.8, 0.1, 0.6, 0.3, 0.5, 0.2, 0.4, 0.7]),
        tags: ["trap", "drums", "808", "hip hop"]
      },
      {
        name: "Acoustic Strum",
        category: "Guitar",
        tempo: 120,
        key: "D",
        audioUrl: "/audio/samples/acoustic-strum.mp3",
        waveformData: JSON.stringify([0.3, 0.5, 0.4, 0.6, 0.3, 0.4, 0.5, 0.3, 0.4, 0.2, 0.4]),
        tags: ["acoustic", "guitar", "strum", "organic"]
      },
      {
        name: "Retro Arp",
        category: "Synth",
        tempo: 100,
        key: "Am",
        audioUrl: "/audio/samples/retro-arp.mp3",
        waveformData: JSON.stringify([0.2, 0.1, 0.4, 0.2, 0.5, 0.3, 0.6, 0.4, 0.2, 0.3, 0.1]),
        tags: ["retro", "arp", "synth", "80s"]
      },
      {
        name: "Deep Bass",
        category: "Bass",
        tempo: 123,
        key: "D",
        audioUrl: "/audio/samples/deep-bass.mp3",
        waveformData: JSON.stringify([0.6, 0.5, 0.7, 0.6, 0.8, 0.7, 0.6, 0.5, 0.6, 0.7, 0.6]),
        tags: ["bass", "deep", "sub", "electronic"]
      }
    ];
    
    const samples = await Promise.all(
      sampleData.map(async (sample) => {
        const [newSample] = await db.insert(schema.samples)
          .values(sample)
          .returning()
          .onConflictDoNothing();
        return newSample;
      })
    );
    
    console.log(`Created ${samples.filter(Boolean).length} sound library samples`);
    
    console.log("Database seeding completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
